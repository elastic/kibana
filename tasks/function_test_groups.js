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

import execa from 'execa';
import grunt from 'grunt';

/**
 * The list of tags that we use in the functional tests, if we add a new group we need to add it to this list
 * and to the list of jobs in .ci/jobs.yml
 */
const TEST_TAGS = [
  'ciGroup2-1',
  'ciGroup2-2',
  'ciGroup2-3',
  'ciGroup2-4',
  'ciGroup2-5',
  'ciGroup2-6',
  'ciGroup2-7',
  'ciGroup2-8',
  'ciGroup2-9',
  'ciGroup2-10',
  'ciGroup2-11',
  'ciGroup2-12',
  'ciGroup2-13',
  'ciGroup2-14',
  'ciGroup2-15',
  'ciGroup2-16',
  'ciGroup2-17',
  'ciGroup2-18',
  'ciGroup2-19',
  'ciGroup2-20'
];

export function getFunctionalTestGroupRunConfigs({ esFrom, kibanaInstallDir } = {}) {
  return {
    // include a run task for each test group
    ...TEST_TAGS.reduce((acc, tag) => ({
      ...acc,
      [`functionalTests_${tag}`]: {
        cmd: process.execPath,
        args: [
          'scripts/functional_tests',
          '--include-tag', tag,
          '--config', 'test/functional/config.js',
          '--esFrom', esFrom,
          '--bail',
          '--debug',
          '--kibana-install-dir', kibanaInstallDir,
        ],
      }
    }), {}),
  };
}

grunt.registerTask(
  'functionalTests:ensureAllTestsInCiGroup',
  'Check that all of the functional tests are in a CI group',
  async function () {
    const done = this.async();

    try {
      const stats = JSON.parse(await execa.stderr(process.execPath, [
        'scripts/functional_test_runner',
        ...TEST_TAGS.map(tag => `--include-tag=${tag}`),
        '--config', 'test/functional/config.js',
        '--test-stats'
      ]));

      if (stats.excludedTests.length > 0) {
        grunt.fail.fatal(`
          ${stats.excludedTests.length} tests are excluded by the ciGroup tags, make sure that
          all test suites have a "ciGroup{X}" tag and that "tasks/functional_test_groups.js"
          knows about the tag that you are using.

          tags: ${JSON.stringify({ include: TEST_TAGS })}

          - ${stats.excludedTests.join('\n          - ')}
        `);
        return;
      }

      done();
    } catch (error) {
      grunt.fail.fatal(error.stack);
    }
  }
);
