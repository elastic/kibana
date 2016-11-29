module.exports = function (grunt) {
  grunt.registerTask('plugin', [
    'build',
    'compress:plugin'
  ]);
};
