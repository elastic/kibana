module.exports = function (grunt) {
  grunt.registerTask('dev', [
    'less',
    'jade',
    'run:kibana_server',
    'maybe_start_server',
    'watch'
  ]);
};
