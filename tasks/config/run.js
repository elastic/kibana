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
      args: [
        '--env.name=development',
        '--logging.json=false',
        '--optimize.tests=true',
        '--optimize.lazy=false'
      ]
    },

    optimizeBuild: {
      options: {
        wait: false,
        ready: /Optimization .+ complete/,
        quiet: true
      },
      cmd: './build/kibana/bin/kibana',
      args: [
        '--env.name=production',
        '--logging.json=false',
        '--plugins.initialize=false',
        '--server.autoListen=false'
      ]
    }
  };

};
