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
