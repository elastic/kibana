import { execFileSync } from 'child_process';

function exec(cmd, args, opts) {
  console.log(' >', cmd, args.join(' '));
  exec.silent(cmd, args, opts);
}

exec.silent = function (cmd, args, opts) {
  opts = opts || {};
  if (!opts.stdio) opts.stdio = ['ignore', 1, 2];
  try {
    execFileSync(cmd, args, opts);
  } catch (e) {
    if (opts.stdio[1] !== 1) {
      console.log(e.stdout + '');
    }

    if (opts.stdio[2] !== 2) {
      console.log(e.stderr + '');
    }

    throw e;
  }
};

module.exports = exec;
