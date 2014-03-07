module.exports = function (grunt) {
  grunt.registerTask('dev', [
    'less',
    'jade',
    'maybe_start_server',
    'watch'
  ]);
};