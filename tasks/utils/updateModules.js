
var manifests = [
  {
    file: 'package.json',
    cmd: 'npm update && npm prune'
  },
  {
    file: 'bower.json',
    cmd: 'bower install --force-latest && bower prune'
  }
];

var _ = require('lodash');
var Promise = require('bluebird');
var spawn = require('child_process').spawn;
var cmds = _.pluck(manifests, 'cmd');

console.log('running', cmds.map(function (cmd) {
  return '"' + cmd + '"';
}).join(' and '));

return Promise.settle(cmds.map(function (cmd) {
  return execWithProgress(cmd, function () {
    process.stdout.write('.');
  });
}))
.then(function (results) {
  var fails = results.filter(function (res) {
    return res.isRejected() && res.reason();
  });

  if (fails.length) {
    fails.forEach(function (err) {
      console.log(err.message);
    });
  } else {
    console.log('update complete');
  }
});

/////////
/// utils
/////////
function execWithProgress(cmd, progress) {
  return new Promise(function (resolve, reject) {

    var file = '/bin/sh';
    var args = ['-c', cmd];
    var options = {
      stdio: ['ignore', 'pipe', 'pipe']
    };
    var ping = _.throttle(progress || _.noop, 200);

    if (process.platform === 'win32') {
      file = process.env.comspec || 'cmd.exe';
      args = ['/s', '/c', '"' + cmd + '"'];
      options.windowsVerbatimArguments = true;
    }

    var proc = spawn(file, args, options);
    var stdout = '';
    var stderr = '';

    proc.stdout.on('data', function (data) {
      stdout += data;
      ping();
    });

    proc.stderr.on('data', function (data) {
      stderr += data;
      ping();
    });

    proc.on('close', function (code) {
      if (!code) resolve();

      var msg = '"' + cmd + '" failed with status code ' + code;
      if (stdout) {
        msg += '\nSTDOUT:\n' + stdout + '\n';
      }

      if (stderr) {
        msg += '\nSTDERR:\n' + stderr + '\n';
      }

      reject(new Error(msg));
    });
  });
}

