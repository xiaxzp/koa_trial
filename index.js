const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const fs = require('fs');
const path = require('path');
const app = new Koa();

const router = new Router();

const configPath = path.join(__dirname, 'src/config.json');
const configFileId = fs.openSync(configPath, 'r+');
const configFile = JSON.parse(fs.readFileSync(configFileId, {encoding: 'utf8'}));
const weightPath = path.join(__dirname, 'src/weight.json');
const weightFileId = fs.openSync(weightPath, 'r+');
const weightFile = JSON.parse(fs.readFileSync(weightFileId, {encoding: 'utf8'}));

const indexFile = fs.readFileSync(path.join(__dirname, 'view/index.html'), {
  encoding: 'utf-8',
})

let time = new Date().getTime();
function writeFiles(jsonObj, fileid) {
  fs.writeFile(fileid, JSON.stringify(jsonObj, null, 2), {
    encoding: 'utf-8',
  }, (err) => {
    if (err) throw err;
    console.log('文件已被保存');
  })
}

// logger
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.get('X-Response-Time');
  console.log(`${ctx.method} ${ctx.url} - ${rt}`, ctx.request.body);
});
// response

const about = (ctx, next) => {
  ctx.response.type = 'html';
  ctx.response.body = '<a href="/">Index Page</a>';
};

const main = (ctx, next) => {
  ctx.response.type = 'html';
  ctx.response.body = indexFile;
};
const generate = async (ctx, next) => {
  const res = [];
  console.log(configFile, typeof configFile);
  Object.keys(configFile).forEach(key => {
    const obj = configFile[key];
    const wobj = weightFile[key];
    const arr = Object.values(wobj);
    const sum = arr.reduce((a,b) => {
      return a + b;
    }, 0);
    const rd = Math.floor(Math.random() * sum);
    let sumin = arr[0];
    let i = 0;
    while(rd > sumin) {
      sumin += arr[i];
      i += 1;
    }
    res.push({
      key,
      id: i,
      text: obj[i],
    })
  })
  ctx.response.body = {code: 0, data: res};
};
const fallback = async function(ctx, next) {
  console.log(ctx.request.body, typeof ctx.request.body);
  const {useful, data} = ctx.request.body;
  data.forEach(item => {
    if (useful) {
      weightFile[item.key][item.id] = Math.min(weightFile[item.key][item.id] + 2, 200);
    } else {
      weightFile[item.key][item.id] = Math.max(weightFile[item.key][item.id] - 2, 10);
    }
  })
  const newtime = new Date().getTime();
  if (newtime - time > 5 * 60 * 1000) {
    time = newtime;
    writeFiles(weightFile, weightPath);
  }
  ctx.response.body = {code: 0};
};
router.get('/', main);
router.get('/about', about);
router.get('/api/generate', generate);
router.post('/api/fallback', fallback);

app.use(bodyParser())
app
  .use(router.routes())
  .use(router.allowedMethods());


app.listen(3000);