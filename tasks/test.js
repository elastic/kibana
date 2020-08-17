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

import { run } from '../utilities/visual_regression';

module.exports = function (grunt) {
  grunt.registerTask(
    'test:visualRegression:buildGallery',
    'Compare screenshots and generate diff images.',
    function () {
      const done = this.async();
      run(done);
    }
  );

  grunt.registerTask('test:quick', [
    'checkPlugins',
    'run:mocha',
    'run:functionalTests',
    'test:jest',
    'test:jest_integration',
    'test:projects',
    'run:apiIntegrationTests',
  ]);

  grunt.registerTask('test:mochaCoverage', ['run:mochaCoverage']);

  grunt.registerTask('test', (subTask) => {
    if (subTask) grunt.fail.fatal(`invalid task "test:${subTask}"`);

    grunt.task.run(
      [
        !grunt.option('quick') && 'run:eslint',
        !grunt.option('quick') && 'run:sasslint',
        !grunt.option('quick') && 'run:checkTsProjects',
        !grunt.option('quick') && 'run:checkDocApiChanges',
        !grunt.option('quick') && 'run:typeCheck',
        !grunt.option('quick') && 'run:i18nCheck',
        'run:checkFileCasing',
        'run:licenses',
        'test:quick',
      ].filter(Boolean)
    );
  });

  grunt.registerTask('quick-test', ['test:quick']); // historical alias

  grunt.registerTask('test:projects', function () {
    const done = this.async();
    runProjectsTests().then(done, done);
  });

  function runProjectsTests() {
    const serverCmd = {
      cmd: 'yarn',
      args: ['kbn', 'run', 'test', '--exclude', 'kibana', '--oss', '--skip-kibana-plugins'],
      opts: { stdio: 'inherit' },
    };

    return new Promise((resolve, reject) => {
      grunt.util.spawn(serverCmd, (error, result, code) => {
        if (error || code !== 0) {
          const error = new Error(`projects tests exited with code ${code}`);
          grunt.fail.fatal(error);
          reject(error);
          return;
        }

        grunt.log.writeln(result);
        resolve();
      });
    });
  }
};
