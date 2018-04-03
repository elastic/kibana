const cp = require('child_process');
const n = cp.fork(`${__dirname}/../cli/index.js`, process.argv.splice(2, process.argv.length - 1));

const bind = (type) => {
  return (payload) => {
    n.send({ type, payload });
  };
};

n.on('message', (msg) => {
  const { type, args } = msg;
  switch(type) {
    case 'spawn': {
      const p = cp.spawn(args.command, args.args);
      p.stderr.on('data', data => bind('stderr')(data.toString()));
      p.stdout.on('data', data => bind('stdout')(data.toString()));
      p.addListener('error', data => bind('error')(data));
      p.addListener('exit', data => bind('exit')(data));
      break;
    }
    default: {
      console.log('Received unhandled message', msg);
    }
  }
});
