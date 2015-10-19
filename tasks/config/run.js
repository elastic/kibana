module.exports = function (grunt) {
  let platform = require('os').platform();
  let {resolve} = require('path');
  let root = p => resolve(__dirname, '../../', p);
  let binScript =  /^win/.test(platform) ? '.\\bin\\kibana.bat' : './bin/kibana';

  return {
    testServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        '--server.port=5610',
        '--env.name=development',
        '--logging.json=false',
        '--optimize.bundleFilter=tests',
        '--plugins.initialize=false'
      ]
    },

    testUIServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: /^win/.test(platform) ? '.\\bin\\kibana.bat' : './bin/kibana',
      args: [
        '--server.port=5620',
        '--elasticsearch.url=http://localhost:9220',
        '--logging.json=false'
      ]
    },

    testCoverageServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
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
      cmd: binScript,
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

    seleniumServer: {
      options: {
        wait: false,
        ready: /Selenium Server is up and running/,
        quiet: true,
        failOnError: false
      },
      cmd: 'java',
      args: [
        '-jar',
        'selenium/selenium-server-standalone-2.47.1.jar'
      ]
    },

    devSeleniumServer: {
      options: {
        wait: false,
        ready: /Selenium Server is up and running/,
        quiet: false,
        failOnError: false
      },
      cmd: 'java',
      args: [
        '-jar',
        'selenium/selenium-server-standalone-2.47.1.jar'
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
