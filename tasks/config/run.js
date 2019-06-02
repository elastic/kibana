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
    '--env.name=development',
    '--plugins.initialize=false',
    '--optimize.bundleFilter=tests',
    '--server.port=5610',
  ];

  const NODE = 'node';
  const scriptWithGithubChecks = ({ title, options, cmd, args }) => (
    process.env.CHECKS_REPORTER_ACTIVE === 'true' ? {
      options,
      cmd: 'yarn',
      args: ['run', 'github-checks-reporter', title, cmd, ...args],
    } : { options, cmd, args });
  const gruntTaskWithGithubChecks = (title, task) =>
    scriptWithGithubChecks({
      title,
      cmd: 'yarn',
      args: ['run', 'grunt', task]
    });

  return {
    // used by the test and jenkins:unit tasks
    //    runs the eslint script to check for linting errors
    eslint: scriptWithGithubChecks({
      title: 'eslint',
      cmd: NODE,
      args: [
        'scripts/eslint',
        '--no-cache'
      ]
    }),

    sasslint: scriptWithGithubChecks({
      title: 'sasslint',
      cmd: NODE,
      args: [
        'scripts/sasslint'
      ]
    }),

    // used by the test tasks
    //    runs the check_file_casing script to ensure filenames use correct casing
    checkFileCasing: scriptWithGithubChecks({
      title: 'Check file casing',
      cmd: NODE,
      args: [
        'scripts/check_file_casing',
        '--quiet' // only log errors, not warnings
      ]
    }),

    // used by the test tasks
    //    runs the check_core_api_changes script to ensure API changes are explictily accepted
    checkCoreApiChanges: scriptWithGithubChecks({
      title: 'Check core API changes',
      cmd: NODE,
      args: [
        'scripts/check_core_api_changes'
      ]
    }),

    // used by the test and jenkins:unit tasks
    //    runs the typecheck script to check for Typescript type errors
    typeCheck: scriptWithGithubChecks({
      title: 'Type check',
      cmd: NODE,
      args: [
        'scripts/type_check'
      ]
    }),

    // used by the test and jenkins:unit tasks
    //    ensures that all typescript files belong to a typescript project
    checkTsProjects: scriptWithGithubChecks({
      title: 'TypeScript - all files belong to a TypeScript project',
      cmd: NODE,
      args: [
        'scripts/check_ts_projects'
      ]
    }),

    // used by the test and jenkins:unit tasks
    //    runs the i18n_check script to check i18n engine usage
    i18nCheck: scriptWithGithubChecks({
      title: 'Internationalization check',
      cmd: NODE,
      args: [
        'scripts/i18n_check',
        '--ignore-missing',
      ]
    }),

    // used by the test:server task
    //    runs all node.js/server mocha tests
    mocha: scriptWithGithubChecks({
      title: 'Mocha tests',
      cmd: NODE,
      args: [
        'scripts/mocha'
      ]
    }),

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
        '--no-dev-config',
        '--no-watch',
        '--no-base-path',
        '--optimize.watchPort=5611',
        '--optimize.watchPrebuild=true',
        '--optimize.bundleDir=' + resolve(__dirname, '../../optimize/testdev'),
      ]
    }),

    verifyNotice: scriptWithGithubChecks({
      title: 'Verify NOTICE.txt',
      options: {
        wait: true,
      },
      cmd: NODE,
      args: [
        'scripts/notice',
        '--validate'
      ]
    }),

    apiIntegrationTests: scriptWithGithubChecks({
      title: 'API integration tests',
      cmd: NODE,
      args: [
        'scripts/functional_tests',
        '--config', 'test/api_integration/config.js',
        '--bail',
        '--debug',
      ],
    }),

    serverIntegrationTests: scriptWithGithubChecks({
      title: 'Server integration tests',
      cmd: NODE,
      args: [
        'scripts/functional_tests',
        '--config', 'test/server_integration/http/ssl/config.js',
        '--config', 'test/server_integration/http/ssl_redirect/config.js',
        '--bail',
        '--debug',
        '--kibana-install-dir', KIBANA_INSTALL_DIR,
      ],
    }),

    interpreterFunctionalTestsRelease: scriptWithGithubChecks({
      title: 'Interpreter functional tests',
      cmd: NODE,
      args: [
        'scripts/functional_tests',
        '--config', 'test/interpreter_functional/config.js',
        '--bail',
        '--debug',
        '--kibana-install-dir', KIBANA_INSTALL_DIR,
      ],
    }),

    pluginFunctionalTestsRelease: scriptWithGithubChecks({
      title: 'Plugin functional tests',
      cmd: NODE,
      args: [
        'scripts/functional_tests',
        '--config', 'test/plugin_functional/config.js',
        '--bail',
        '--debug',
        '--kibana-install-dir', KIBANA_INSTALL_DIR,
      ],
    }),

    functionalTests: scriptWithGithubChecks({
      title: 'Functional tests',
      cmd: NODE,
      args: [
        'scripts/functional_tests',
        '--config', 'test/functional/config.js',
        '--bail',
        '--debug',
      ],
    }),

    licenses: scriptWithGithubChecks({
      title: 'Check licenses',
      cmd: NODE,
      args: [
        'scripts/check_licenses',
        '--dev',
      ],
    }),

    verifyDependencyVersions:
      gruntTaskWithGithubChecks('Verify dependency versions', 'verifyDependencyVersions'),
    test_server:
      gruntTaskWithGithubChecks('Server tests', 'test:server'),
    test_jest: gruntTaskWithGithubChecks('Jest tests', 'test:jest'),
    test_jest_integration:
      gruntTaskWithGithubChecks('Jest integration tests', 'test:jest_integration'),
    test_projects: gruntTaskWithGithubChecks('Project tests', 'test:projects'),
    test_browser_ci:
      gruntTaskWithGithubChecks('Browser tests', 'test:browser-ci'),

    ...getFunctionalTestGroupRunConfigs({
      kibanaInstallDir: KIBANA_INSTALL_DIR
    })
  };
};
