module.exports = function (grunt) {
  let platform = require('os').platform();
  let {format} = require('url');
  let {resolve} = require('path');
  let root = p => resolve(__dirname, '../../', p);
  let binScript =  /^win/.test(platform) ? '.\\bin\\kibana.bat' : './bin/kibana';
  let uiConfig = require(root('test/serverConfig'));
  let chromedriver = require('chromedriver');

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
        '--server.port=' + uiConfig.servers.kibana.port,
        '--env.name=development',
        '--elasticsearch.url=' + format(uiConfig.servers.elasticsearch),
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

    chromeDriver: {
      options: {
        wait: false,
        ready: /Starting ChromeDriver/,
        quiet: false,
        failOnError: false
      },
      cmd: 'chromedriver.path',
      args: [
        `--port=${uiConfig.servers.webdriver.port}`,
        '--url-base=wd/hub'
      ]
    },

    devChromeDriver: {
      options: {
        wait: false,
        ready: /Starting ChromeDriver/,
        quiet: false,
        failOnError: false
      },
      cmd: 'chromedriver.path',
      args: [
        `--port=${uiConfig.servers.webdriver.port}`,
        '--url-base=wd/hub'
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
