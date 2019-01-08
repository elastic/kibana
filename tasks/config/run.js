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
import { getFunctionalTestGroupRunConfigs } from '../function_test_groups';

const { version } = require('../../package.json');
const KIBANA_INSTALL_DIR = `./build/oss/kibana-${version}-SNAPSHOT-${process.platform}-x86_64`;

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
        : process.execPath,
      args: [
        ...runBuild ? [] : [require.resolve('../../scripts/kibana'), '--oss'],

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

  const esFrom = process.env.TEST_ES_FROM || 'source';
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

    sasslint: {
      cmd: process.execPath,
      args: [
        require.resolve('../../scripts/sasslint')
      ]
    },

    // used by the test tasks
    //    runs the check_file_casing script to ensure filenames use correct casing
    checkFileCasing: {
      cmd: process.execPath,
      args: [
        require.resolve('../../scripts/check_file_casing'),
        '--quiet' // only log errors, not warnings
      ]
    },

    // used by the test and jenkins:unit tasks
    //    runs the tslint script to check for Typescript linting errors
    tslint: {
      cmd: process.execPath,
      args: [
        require.resolve('../../scripts/tslint')
      ]
    },

    // used by the test and jenkins:unit tasks
    //    runs the tslint script to check for Typescript linting errors
    typeCheck: {
      cmd: process.execPath,
      args: [
        require.resolve('../../scripts/type_check')
      ]
    },

    // used by the test and jenkins:unit tasks
    //    runs the i18n_check script to check i18n engine usage
    i18nCheck: {
      cmd: process.execPath,
      args: [
        require.resolve('../../scripts/i18n_check'),
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
    browserSCSS: createKbnServerTask({
      flags: [
        ...browserTestServerFlags,
        '--optimize',
        '--optimize.enabled=false'
      ]
    }),

    // used by the test:coverage task
    //    runs the kibana server to serve the instrumented version of the browser test bundle
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
        '--esFrom', esFrom,
        '--bail',
        '--debug',
      ],
    },

    serverIntegrationTests: {
      cmd: process.execPath,
      args: [
        'scripts/functional_tests',
        '--config', 'test/server_integration/http/ssl/config.js',
        '--config', 'test/server_integration/http/ssl_redirect/config.js',
        '--esFrom', esFrom,
        '--bail',
        '--debug',
        '--kibana-install-dir', KIBANA_INSTALL_DIR,
      ],
    },

    pluginFunctionalTestsRelease: {
      cmd: process.execPath,
      args: [
        'scripts/functional_tests',
        '--config', 'test/plugin_functional/config.js',
        '--esFrom', esFrom,
        '--bail',
        '--debug',
        '--kibana-install-dir', KIBANA_INSTALL_DIR,
        '--',
        '--server.maxPayloadBytes=1648576',
      ],
    },

    functionalTests: {
      cmd: process.execPath,
      args: [
        'scripts/functional_tests',
        '--config', 'test/functional/config.js',
        '--esFrom', esFrom,
        '--bail',
        '--debug',
        '--',
        '--server.maxPayloadBytes=1648576', //default is 1048576
      ],
    },

    ...getFunctionalTestGroupRunConfigs({
      esFrom,
      kibanaInstallDir: KIBANA_INSTALL_DIR
    })
  };
};
