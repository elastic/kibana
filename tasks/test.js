module.exports = function (grunt) {
  /* jshint scripturl:true */
  grunt.registerTask('test', [
    'jshint',
    'maybe_start_server',
    'jade',
    'mocha:unit'
  ]);

  grunt.registerTask('coverage', [
    'blanket',
    'maybe_start_server',
    'mocha:coverage'
  ]);

  grunt.registerTask('test:watch', [
    'maybe_start_server',
    'watch:test'
  ]);
};
