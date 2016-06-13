module.exports = function (grunt) {
  let platform = require('os').platform();
  let {format} = require('url');
  let {resolve} = require('path');
  let root = p => resolve(__dirname, '../../', p);
  let binScript =  /^win/.test(platform) ? '.\\bin\\kibana.bat' : './bin/kibana';
  let buildScript =  /^win/.test(platform) ? '.\\build\\kibana\\bin\\kibana.bat' : './build/kibana/bin/kibana';
  let uiConfig = require(root('test/server_config'));
  let chromedriver = require('chromedriver');

  const stdDevArgs = [
    '--env.name=development',
    '--logging.json=false',
  ];

  const buildTestsArgs = [
    ...stdDevArgs,
    '--plugins.initialize=false',
    '--optimize.bundleFilter=tests',
  ];

  const kbnServerFlags = grunt.option.flags().reduce(function (flags, flag) {
    if (flag.startsWith('--kbnServer.')) {
      flags.push(`--${flag.slice(12)}`);
    }

    return flags;
  }, []);

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
        ...buildTestsArgs,
        '--server.port=5610',
        ...kbnServerFlags,
      ]
    },

    apiTestServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...stdDevArgs,
        '--optimize.enabled=false',
        '--elasticsearch.url=' + format(uiConfig.servers.elasticsearch),
        '--server.port=' + uiConfig.servers.kibana.port,
        '--server.xsrf.disableProtection=true',
        ...kbnServerFlags,
      ]
    },

    testUIServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...stdDevArgs,
        '--server.port=' + uiConfig.servers.kibana.port,
        '--elasticsearch.url=' + format(uiConfig.servers.elasticsearch),
        ...kbnServerFlags,
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
        ...buildTestsArgs,
        '--server.port=5610',
        '--tests_bundle.instrument=true',
        ...kbnServerFlags,
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
        ...buildTestsArgs,
        '--dev',
        '--no-watch',
        '--no-ssl',
        '--no-base-path',
        '--server.port=5610',
        '--optimize.lazyPort=5611',
        '--optimize.lazyPrebuild=true',
        ...kbnServerFlags,
      ]
    },

    chromeDriver: {
      options: {
        wait: false,
        ready: /Starting ChromeDriver/,
        quiet: false,
        failOnError: false
      },
      cmd: chromedriver.path,
      args: [
        `--port=${uiConfig.servers.webdriver.port}`,
        '--url-base=wd/hub',
      ]
    },

    devChromeDriver: {
      options: {
        wait: false,
        ready: /Starting ChromeDriver/,
        quiet: false,
        failOnError: false
      },
      cmd: chromedriver.path,
      args: [
        `--port=${uiConfig.servers.webdriver.port}`,
        '--url-base=wd/hub',
      ]
    },

    optimizeBuild: {
      options: {
        wait: false,
        ready: /Optimization .+ complete/,
        quiet: true
      },
      cmd: buildScript,
      args: [
        '--env.name=production',
        '--logging.json=false',
        '--plugins.initialize=false',
        '--server.autoListen=false',
        ...kbnServerFlags,
      ]
    }
  };

};
