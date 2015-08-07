module.exports = function (grunt) {
  let {resolve} = require('path');
  let root = p => resolve(__dirname, '../../', p);

  return {
    testServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: './bin/kibana',
      args: ['--env.name=development', '--logging.json=false', '--optimize.bundleFilter=tests']
    }
  };

};
