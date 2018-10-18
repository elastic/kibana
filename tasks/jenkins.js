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

import { reportFailedTests } from '../src/dev/failed_tests/report';

module.exports = function (grunt) {
  grunt.registerTask('jenkins:docs', [
    'docker:docs'
  ]);

  grunt.registerTask('jenkins:unit', [
    'run:eslint',
    'run:tslint',
    'run:typeCheck',
    'run:i18nCheck',
    'run:checkFileCasing',
    'licenses',
    'verifyDependencyVersions',
    'run:verifyNotice',
    'test:server',
    'test:jest',
    'test:jest_integration',
    'test:projects',
    'test:browser-ci',
    'run:apiIntegrationTests',
  ]);

  grunt.registerTask('jenkins:selenium', [
    'checkPlugins',
    'run:functionalTestsRelease',
    'run:pluginFunctionalTestsRelease',
  ]);

  grunt.registerTask(
    'jenkins:report',
    'Reports failed tests found in junit xml files to Github issues',
    function () {
      reportFailedTests(this.async());
    }
  );
};
