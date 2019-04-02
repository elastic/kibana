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

module.exports = function (grunt) {
  grunt.registerTask('jenkins:docs', ['docker:docs']);

  grunt.registerTask('jenkins:unit', [
    'run:eslint',
    'run:tslint',
    'run:sasslint',
    'run:checkTsProjects',
    'run:typeCheck',
    'run:i18nCheck',
    'run:checkFileCasing',
    // 'licenses', DO NOT CHECK IN -- THIS TO ENABLE SIEM TO BUILD QUICKLY WITHOUT FALSE POSITIVES
    'verifyDependencyVersions',
    // 'run:verifyNotice', DO NOT CHECK IN -- THIS TO ENABLE SIEM TO BUILD QUICKLY WITHOUT FALSE POSITIVES
    // 'test:server', DO NOT CHECK IN -- THIS TO ENABLE SIEM TO BUILD QUICKLY WITHOUT FALSE POSITIVES
    // 'test:jest', DO NOT CHECK IN -- THIS TO ENABLE SIEM TO BUILD QUICKLY WITHOUT FALSE POSITIVES
    // 'test:jest_integration', DO NOT CHECK IN -- THIS TO ENABLE SIEM TO BUILD QUICKLY WITHOUT FALSE POSITIVES
    // 'test:projects', DO NOT CHECK IN -- THIS TO ENABLE SIEM TO BUILD QUICKLY WITHOUT FALSE POSITIVES
    // 'test:browser-ci', DO NOT CHECK IN -- THIS TO ENABLE SIEM TO BUILD QUICKLY WITHOUT FALSE POSITIVES
    // 'run:apiIntegrationTests', DO NOT CHECK IN -- THIS TO ENABLE SIEM TO BUILD QUICKLY WITHOUT FALSE POSITIVES
  ]);
};
