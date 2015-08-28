module.exports = function (grunt) {
  let platform = require('os').platform();
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
      cmd: /^win/.test(platform) ? '.\\bin\\kibana.bat' : './bin/kibana',
      args: [
        '--server.port=5610',
        '--env.name=development',
        '--logging.json=false',
        '--optimize.bundleFilter=tests',
        '--plugins.initialize=false'
      ]
    },

    testCoverageServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: /^win/.test(platform) ? '.\\bin\\kibana.bat' : './bin/kibana',
      args: [
        '--server.port=5610',
        '--env.name=development',
        '--logging.json=false',
        '--optimize.bundleFilter=tests',
        '--plugins.initialize=false',
        '--testsBundle.instrument=true'
      ]
    },

    devTestServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: './bin/kibana',
      args: [
        '--dev',
        '--no-watch',
        '--server.port=5610',
        '--optimize.lazyPort=5611',
        '--optimize.lazyPrebuild=true',
        '--logging.json=false',
        '--optimize.bundleFilter=tests',
        '--plugins.initialize=false'
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
