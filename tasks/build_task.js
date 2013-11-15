module.exports = function(grunt) {
  grunt.registerTask('build', [
    'clean:setup',
    'shell:maven_clean',
    'shell:maven_package',
    'setup',
    'build-kibana',
    'copy:plugin_to_marvel',
  ]);
};