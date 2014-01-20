/* jshint globalstrict: false */
/* global module */
module.exports = function (grunt) {
  'use strict';

  grunt.registerTask('build', [
    'shell:verify_kibana_status',
    'clean:build',
    'shell:maven_clean',
    'shell:maven_package',
    'copy:merge_kibana',
    'copy:merge_marvel',
    'replace:dist_marvel_config',
    'shell:build_kibana',
    'copy:kibana_build',
    'build_sense',
    'copy:exporter_build',
    'clean:build_tmp'
  ]);

  grunt.registerTask('build_sense', [
    'jshint:sense',
    'requirejs:build_sense',
    'clean:sense_build_tests'
  ]);
};