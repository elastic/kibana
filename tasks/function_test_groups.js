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

const TEST_GROUP_IDS = new Array(12).fill(undefined).map((_, i) => i + 1);
const getTaskName = id => `functionalTestsReleaseGroup${id}`;
const getTag = id => `ciGroup${id}`;

export function getFunctionalTestGroupRunConfigs({ esFrom, kibanaInstallDir } = {}) {

  return {
    // include a run task for each test group
    ...TEST_GROUP_IDS.reduce((acc, id) => ({
      ...acc,
      [getTaskName(id)]: {
        cmd: process.execPath,
        args: [
          'scripts/functional_tests',
          '--include-tag', getTag(id),
          '--config', 'test/functional/config.js',
          '--esFrom', esFrom,
          '--bail',
          '--debug',
          '--kibana-install-dir', kibanaInstallDir,
          '--',
          '--server.maxPayloadBytes=1648576',
        ],
      }
    }), {}),

    // also include a run task for any test that is not in a group
    functionalTestsAssertTagCoverage: {
      cmd: process.execPath,
      args: [
        'scripts/functional_test_runner',
        '--assert-none-excluded',
        ...TEST_GROUP_IDS.reduce((acc, id) => [
          ...acc,
          '--include-tag',
          getTag(id)
        ], [])
      ],
    },
  };
}
