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
  'ciGroup1-1',
  'ciGroup2-1',
  'ciGroup3-1',
  'ciGroup4-1',
  'ciGroup5-1',
  'ciGroup6-1',
  'ciGroup7-1',
  'ciGroup8-1',
  'ciGroup9-1',
  'ciGroup10-1',
  'ciGroup11-1',
  'ciGroup12-1',
  'ciGroup1-2',
  'ciGroup2-2',
  'ciGroup3-2',
  'ciGroup4-2',
  'ciGroup5-2',
  'ciGroup6-2',
  'ciGroup7-2',
  'ciGroup8-2',
  'ciGroup9-2',
  'ciGroup10-2',
  'ciGroup11-2',
  'ciGroup12-2',
  'ciGroup1-3',
  'ciGroup2-3',
  'ciGroup3-3',
  'ciGroup4-3',
  'ciGroup5-3',
  'ciGroup6-3',
  'ciGroup7-3',
  'ciGroup8-3',
  'ciGroup9-3',
  'ciGroup10-3',
  'ciGroup11-3',
  'ciGroup12-3',
  'ciGroup1-4',
  'ciGroup2-4',
  'ciGroup3-4',
  'ciGroup4-4',
  'ciGroup5-4',
  'ciGroup6-4',
  'ciGroup7-4',
  'ciGroup8-4',
  'ciGroup9-4',
  'ciGroup10-4',
  'ciGroup11-4',
  'ciGroup12-4',
  'ciGroup1-5',
  'ciGroup2-5',
  'ciGroup3-5',
  'ciGroup4-5',
  'ciGroup5-5',
  'ciGroup6-5',
  'ciGroup7-5',
  'ciGroup8-5',
  'ciGroup9-5',
  'ciGroup10-5',
  'ciGroup11-5',
  'ciGroup12-5',
  'ciGroup1-6',
  'ciGroup2-6',
  'ciGroup3-6',
  'ciGroup4-6',
  'ciGroup5-6',
  'ciGroup6-6',
  'ciGroup7-6',
  'ciGroup8-6',
  'ciGroup9-6',
  'ciGroup10-6',
  'ciGroup11-6',
  'ciGroup12-6',
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
