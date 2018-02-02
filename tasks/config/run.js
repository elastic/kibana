import { esTestConfig } from '../../src/test_utils/es';
import { kibanaTestServerUrlParts } from '../../test/kibana_test_server_url_parts';
import { resolve, join } from 'path';
import { platform as getPlatform } from 'os';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const PLATFORM = getPlatform();

module.exports = function (grunt) {
  const binScript =  `node`;
  const pkgVersion = grunt.config.get('pkg.version');
  const releaseBinScript = `./build/kibana-${pkgVersion}-linux-x86_64/bin/kibana`;
  const optimizeScript = /^win/.test(PLATFORM) ? '.\\build\\kibana\\bin\\kibana.bat' : './build/kibana/bin/kibana';
  const binArgs = [
    join('scripts', 'kibana'),
  ];

  const stdDevArgs = [
    '--env.name=development',
    '--logging.json=false',
  ];

  const testUIArgs = [
    '--server.maxPayloadBytes=1648576', //default is 1048576
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
    eslint: {
      cmd: process.execPath,
      args: [
        require.resolve('../../scripts/eslint'),
        '--no-cache'
      ]
    },

    testServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...binArgs,
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
        ...binArgs,
        ...stdDevArgs,
        '--optimize.enabled=false',
        '--elasticsearch.url=' + esTestConfig.getUrl(),
        '--elasticsearch.healthCheck.delay=' + HOUR,
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
        ...binArgs,
        ...stdDevArgs,
        '--dev',
        '--no-base-path',
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
        ...binArgs,
        ...stdDevArgs,
        ...testUIArgs,
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
        ...testUIArgs,
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
        ...binArgs,
        ...stdDevArgs,
        ...testUIArgs,
        '--server.port=' + kibanaTestServerUrlParts.port,
        '--elasticsearch.url=' + esTestConfig.getUrl(),
        '--dev',
        '--dev_mode.enabled=false',
        '--no-base-path',
        '--optimize.watchPort=5611',
        '--optimize.watchPrebuild=true',
        '--optimize.bundleDir=' + resolve(__dirname, '../../optimize/testUiServer'),
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
        ...binArgs,
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
        ...binArgs,
        ...buildTestsArgs,
        '--dev',
        '--no-watch',
        '--no-base-path',
        '--server.port=5610',
        '--optimize.watchPort=5611',
        '--optimize.watchPrebuild=true',
        '--optimize.bundleDir=' + resolve(__dirname, '../../optimize/testdev'),
        ...kbnServerFlags,
      ]
    },

    optimizeBuild: {
      options: {
        wait: false,
        ready: /Optimization .+ complete/,
        quiet: true
      },
      cmd: optimizeScript,
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
