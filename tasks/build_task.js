module.exports = function (grunt) {

  grunt.registerTask('build', [
    'clean:build',
    'shell:maven_clean',
    'shell:maven_package',
    'copy:merge_kibana',
    'copy:merge_marvel',
    'replace:dist_marvel_config',
    'symlink:build_npm',
    'shell:build_kibana',
    'copy:plugin_to_marvel',
  ]);
};