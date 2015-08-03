module.exports = function (grunt) {
  let {resolve} = require('path');
  let root = p => resolve(__dirname, '../../', p);

  return {
    devServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: './bin/kibana',
      args: ['--dev', '--no-watch', '--logging.json=false']
    }
  };

};
