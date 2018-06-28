/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { resolve } from 'path';

const PKG_VERSION = require('../../package.json').version;
const KIBANA_BIN_PATH = process.platform.startsWith('win')
  ? '.\\bin\\kibana.bat'
  : './bin/kibana';

module.exports = function (grunt) {

  function createKbnServerTask({ runBuild, flags = [] }) {
    return {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: runBuild
        ? `./build/${runBuild}/bin/kibana`
        :  KIBANA_BIN_PATH,
      args: [
        ...runBuild ? [] : ['--oss'],

        '--env.name=development',
        '--logging.json=false',

        ...flags,

        // allow the user to override/inject flags by defining cli args starting with `--kbnServer.`
        ...grunt.option.flags().reduce(function (flags, flag) {
          if (flag.startsWith('--kbnServer.')) {
            flags.push(`--${flag.slice(12)}`);
          }

          return flags;
        }, [])
      ]
    };
  }

  const browserTestServerFlags = [
    '--plugins.initialize=false',
    '--optimize.bundleFilter=tests',
    '--server.port=5610',
  ];

  return {
    // used by the test and jenkins:unit tasks
    //    runs the eslint script to check for linting errors
    eslint: {
      cmd: process.execPath,
      args: [
        require.resolve('../../scripts/eslint'),
        '--no-cache'
      ]
    },

    // used by the test:server task
    //    runs all node.js/server mocha tests
    mocha: {
      cmd: process.execPath,
      args: [
        require.resolve('../../scripts/mocha')
      ]
    },

    // used by the test:browser task
    //    runs the kibana server to serve the browser test bundle
    browserTestServer: createKbnServerTask({
      flags: [
        ...browserTestServerFlags,
      ]
    }),

    // used by the test:coverage task
    //    runs the kibana server to serve the intrumented version of the browser test bundle
    browserTestCoverageServer: createKbnServerTask({
      flags: [
        ...browserTestServerFlags,
        '--tests_bundle.instrument=true',
      ]
    }),

    // used by the test:dev task
    //    runs the kibana server to serve the browser test bundle, but listens for changes
    //    to the public/browser code and rebuilds the test bundle on changes
    devBrowserTestServer: createKbnServerTask({
      flags: [
        ...browserTestServerFlags,
        '--dev',
        '--no-watch',
        '--no-base-path',
        '--optimize.watchPort=5611',
        '--optimize.watchPrebuild=true',
        '--optimize.bundleDir=' + resolve(__dirname, '../../optimize/testdev'),
      ]
    }),

    verifyNotice: {
      options: {
        wait: true,
      },
      cmd: process.execPath,
      args: [
        'scripts/notice',
        '--validate'
      ]
    },

    apiIntegrationTests: {
      cmd: process.execPath,
      args: [
        'scripts/functional_tests',
        '--config', 'test/api_integration/config.js',
        '--esFrom', 'source',
        '--bail',
        '--debug',
      ],
    },

    functionalTests: {
      cmd: process.execPath,
      args: [
        'scripts/functional_tests',
        '--config', 'test/functional/config.js',
        '--esFrom', 'source',
        '--bail',
        '--debug',
        '--',
        '--server.maxPayloadBytes=1648576',
        '--dev_mode.enabled=false',
      ],
    },

    functionalTestsRelease: {
      cmd: process.execPath,
      args: [
        'scripts/functional_tests',
        '--config', 'test/functional/config.js',
        '--esFrom', 'source',
        '--bail',
        '--debug',
        '--kibana-install-dir', `./build/oss/kibana-${PKG_VERSION}-${process.platform}-x86_64`,
        '--',
        '--server.maxPayloadBytes=1648576',
        '--dev_mode.enabled=false',
      ],
    },

    functionalTestsDevServer: {
      cmd: process.execPath,
      args: [
        'scripts/functional_tests_server',
        '--config', 'test/functional/config.js',
        '--debug',
        '--',
        '--server.maxPayloadBytes=1648576',
        '--dev_mode.enabled=false',
      ],
    },
  };
};
