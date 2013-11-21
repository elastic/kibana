module.exports = function (grunt) {

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
    'copy:exporter_build',
    'clean:build_tmp'
  ]);
};