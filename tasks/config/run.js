import { esTestConfig } from '../../src/test_utils/es';
import { kibanaTestServerUrlParts } from '../../test/kibana_test_server_url_parts';

module.exports = function (grunt) {
  const platform = require('os').platform();
  const binScript =  /^win/.test(platform) ? '.\\bin\\kibana.bat' : './bin/kibana';
  const buildScript =  /^win/.test(platform) ? '.\\build\\kibana\\bin\\kibana.bat' : './build/kibana/bin/kibana';
  const pkgVersion = grunt.config.get('pkg.version');
  const releaseBinScript = `./build/kibana-${pkgVersion}-linux-x86_64/bin/kibana`;

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
        '--elasticsearch.url=' + esTestConfig.getUrl(),
        '--server.port=' + kibanaTestServerUrlParts.port,
        '--server.xsrf.disableProtection=true',
        ...kbnServerFlags,
      ]
    },

    devApiTestServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...stdDevArgs,
        '--dev',
        '--no-base-path',
        '--no-ssl',
        '--optimize.enabled=false',
        '--elasticsearch.url=' + esTestConfig.getUrl(),
        '--server.port=' + kibanaTestServerUrlParts.port,
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
        '--server.port=' + kibanaTestServerUrlParts.port,
        '--elasticsearch.url=' + esTestConfig.getUrl(),
        ...kbnServerFlags,
      ]
    },

    testUIReleaseServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: releaseBinScript,
      args: [
        ...stdDevArgs,
        '--server.port=' + kibanaTestServerUrlParts.port,
        '--elasticsearch.url=' + esTestConfig.getUrl(),
        ...kbnServerFlags,
      ]
    },

    testUIDevServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...stdDevArgs,
        '--server.port=' + kibanaTestServerUrlParts.port,
        '--elasticsearch.url=' + esTestConfig.getUrl(),
        '--dev',
        '--no-base-path',
        '--no-ssl',
        '--optimize.lazyPort=5611',
        '--optimize.lazyPrebuild=true',
        '--optimize.bundleDir=optimize/testUiServer',
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
        '--optimize.bundleDir=optimize/testdev',
        ...kbnServerFlags,
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
