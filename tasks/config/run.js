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

const { version } = require('../../package.json');
const KIBANA_INSTALL_DIR =
  process.env.KIBANA_INSTALL_DIR ||
  `./build/oss/kibana-${version}-SNAPSHOT-${process.platform}-x86_64`;

module.exports = function () {
  const NODE = 'node';
  const YARN = 'yarn';
  const scriptWithGithubChecks = ({ title, options, cmd, args }) =>
    process.env.CHECKS_REPORTER_ACTIVE === 'true'
      ? {
          options,
          cmd: YARN,
          args: ['run', 'github-checks-reporter', title, cmd, ...args],
        }
      : { options, cmd, args };
  const gruntTaskWithGithubChecks = (title, task) =>
    scriptWithGithubChecks({
      title,
      cmd: YARN,
      args: ['run', 'grunt', task],
    });

  return {
    // used by the test and jenkins:unit tasks
    //    runs the eslint script to check for linting errors
    eslint: scriptWithGithubChecks({
      title: 'eslint',
      cmd: NODE,
      args: ['scripts/eslint', '--no-cache'],
    }),

    sasslint: scriptWithGithubChecks({
      title: 'sasslint',
      cmd: NODE,
      args: ['scripts/sasslint'],
    }),

    // used by the test tasks
    //    runs the check_file_casing script to ensure filenames use correct casing
    checkFileCasing: scriptWithGithubChecks({
      title: 'Check file casing',
      cmd: NODE,
      args: [
        'scripts/check_file_casing',
        '--quiet', // only log errors, not warnings
      ],
    }),

    // used by the test tasks
    //    runs the check_published_api_changes script to ensure API changes are explictily accepted
    checkDocApiChanges: scriptWithGithubChecks({
      title: 'Check core API changes',
      cmd: NODE,
      args: ['scripts/check_published_api_changes'],
    }),

    // used by the test and jenkins:unit tasks
    //    runs the typecheck script to check for Typescript type errors
    typeCheck: scriptWithGithubChecks({
      title: 'Type check',
      cmd: NODE,
      args: ['scripts/type_check'],
    }),

    // used by the test and jenkins:unit tasks
    //    ensures that all typescript files belong to a typescript project
    checkTsProjects: scriptWithGithubChecks({
      title: 'TypeScript - all files belong to a TypeScript project',
      cmd: NODE,
      args: ['scripts/check_ts_projects'],
    }),

    // used by the test and jenkins:unit tasks
    //    runs the i18n_check script to check i18n engine usage
    i18nCheck: scriptWithGithubChecks({
      title: 'Internationalization check',
      cmd: NODE,
      args: ['scripts/i18n_check', '--ignore-missing'],
    }),

    telemetryCheck: scriptWithGithubChecks({
      title: 'Telemetry Schema check',
      cmd: NODE,
      args: ['scripts/telemetry_check'],
    }),

    // used by the test:quick task
    //    runs all node.js/server mocha tests
    mocha: scriptWithGithubChecks({
      title: 'Mocha tests',
      cmd: NODE,
      args: ['scripts/mocha'],
    }),

    // used by the test:mochaCoverage task
    mochaCoverage: scriptWithGithubChecks({
      title: 'Mocha tests coverage',
      cmd: YARN,
      args: [
        'nyc',
        '--reporter=html',
        '--reporter=json-summary',
        '--report-dir=./target/kibana-coverage/mocha',
        NODE,
        'scripts/mocha',
      ],
    }),

    verifyNotice: scriptWithGithubChecks({
      title: 'Verify NOTICE.txt',
      options: {
        wait: true,
      },
      cmd: NODE,
      args: ['scripts/notice', '--validate'],
    }),

    test_hardening: scriptWithGithubChecks({
      title: 'Node.js hardening tests',
      cmd: NODE,
      args: ['scripts/test_hardening.js'],
    }),

    apiIntegrationTests: scriptWithGithubChecks({
      title: 'API integration tests',
      cmd: NODE,
      args: [
        'scripts/functional_tests',
        '--config',
        'test/api_integration/config.js',
        '--bail',
        '--debug',
      ],
    }),

    serverIntegrationTests: scriptWithGithubChecks({
      title: 'Server integration tests',
      cmd: NODE,
      args: [
        'scripts/functional_tests',
        '--config',
        'test/server_integration/http/ssl/config.js',
        '--config',
        'test/server_integration/http/ssl_redirect/config.js',
        '--config',
        'test/server_integration/http/platform/config.ts',
        '--config',
        'test/server_integration/http/ssl_with_p12/config.js',
        '--config',
        'test/server_integration/http/ssl_with_p12_intermediate/config.js',
        '--bail',
        '--debug',
        '--kibana-install-dir',
        KIBANA_INSTALL_DIR,
      ],
    }),

    interpreterFunctionalTestsRelease: scriptWithGithubChecks({
      title: 'Interpreter functional tests',
      cmd: NODE,
      args: [
        'scripts/functional_tests',
        '--config',
        'test/interpreter_functional/config.ts',
        '--bail',
        '--debug',
        '--kibana-install-dir',
        KIBANA_INSTALL_DIR,
      ],
    }),

    pluginFunctionalTestsRelease: scriptWithGithubChecks({
      title: 'Plugin functional tests',
      cmd: NODE,
      args: [
        'scripts/functional_tests',
        '--config',
        'test/plugin_functional/config.ts',
        '--bail',
        '--debug',
      ],
    }),

    exampleFunctionalTestsRelease: scriptWithGithubChecks({
      title: 'Example functional tests',
      cmd: NODE,
      args: [
        'scripts/functional_tests',
        '--config',
        'test/examples/config.js',
        '--bail',
        '--debug',
      ],
    }),

    functionalTests: scriptWithGithubChecks({
      title: 'Functional tests',
      cmd: NODE,
      args: [
        'scripts/functional_tests',
        '--config',
        'test/functional/config.js',
        '--bail',
        '--debug',
      ],
    }),

    licenses: scriptWithGithubChecks({
      title: 'Check licenses',
      cmd: NODE,
      args: ['scripts/check_licenses', '--dev'],
    }),

    test_jest: gruntTaskWithGithubChecks('Jest tests', 'test:jest'),
    test_jest_integration: gruntTaskWithGithubChecks(
      'Jest integration tests',
      'test:jest_integration'
    ),
    test_projects: gruntTaskWithGithubChecks('Project tests', 'test:projects'),
  };
};
