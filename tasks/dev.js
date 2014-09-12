module.exports = function (grunt) {
  grunt.registerTask('dev', [
    'less',
    'jade',
    'ruby_server',
    'maybe_start_server',
    'watch'
  ]);
};
