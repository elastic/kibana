module.exports = function (grunt) {
  var os = require('os');
  var arch = os.arch();
  var platform = os.platform();

  // config:
  // wait: should task wait until the script exits before finishing
  // ready: if not waiting, then how do we know the process is ready?
  // quiet: ignore stdout from the process
  // failOnError: the process is killed if output to stderr

  var options = {
    wait: false,
    ready: /kibana server started/i,
    quiet: true,
    failOnError: true
  };

  var args = ['-H', '127.0.0.1'];

  var config = {
    built_kibana: {
      options: {
        wait: false,
        ready: /Listening/i,
        quiet: true,
        failOnError: false
      },
      cmd: './target/<%= pkg.name + "-" + pkg.version %>-' + platform + '-' + arch + '/bin/kibana',
      args: args
    }
  };

  return config;
};
