module.exports = function(grunt) {
  grunt.registerTask('package', [
    'build',
    'compress:zip',
    'compress:tgz'
  ]);
};