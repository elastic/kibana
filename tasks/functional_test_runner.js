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

import { createFunctionalTestRunner } from '../src/functional_test_runner';
import { createToolingLog } from '@kbn/dev-utils';

export default function (grunt) {
  grunt.registerMultiTask('functional_test_runner', 'run tests with the functional test runner', function () {
    const {
      logLevel,
      configFile,
      configOverrides
    } = this.options();

    const log = createToolingLog(logLevel);
    log.pipe(process.stdout);

    const functionalTestRunner = createFunctionalTestRunner({
      log,
      configFile,
      configOverrides
    });

    const callback = this.async();
    functionalTestRunner.run()
      .then(failureCount => {
        if (failureCount) {
          grunt.fail.warn(`${failureCount} test failures`);
          return;
        }

        callback();
      })
      .catch(err => {
        grunt.fail.warn(err.stack);
        callback(err);
      });
  });
}
