module.exports = function (grunt) {

  grunt.registerTask('build', [
    'clean:build',
    'clean:target',
    'copy:build',
    'compress:build'
  ]);

};
