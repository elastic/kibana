/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



/* jshint globalstrict: false */
/* global module */
module.exports = function (grunt) {
  'use strict';

  grunt.registerTask('build', [
    'shell:verify_kibana_status',
    'jshint',
    'clean:build',
    'build:load_git_versions',
    'shell:maven_clean',
    'shell:maven_package',
    'copy:merge_marvel_kibana',
    'replace:dist_marvel_config',
    'shell:build_kibana',
    'build_sense',
    'copy:artifacts_to_build',
    'clean:build_tmp',
    'replace:git_commits',
    'replace:kibana_replace_title'
  ]);

  grunt.registerTask('build_sense', [
    'requirejs:build_sense',
    'clean:sense_build_tests'
  ]);

  grunt.registerTask('build:load_git_versions', function () {
      grunt.event.once('git-describe', function (desc) {
        grunt.config.set('kibanaCommit', desc.object);
        grunt.event.once('git-describe', function (desc) {
          grunt.config.set('marvelCommit', desc.object);
        });
        grunt.task.run('git-describe:marvel');
      });
      grunt.task.run('git-describe:kibana');
  });
};
