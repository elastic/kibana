module.exports = function (grunt) {
  /* jshint scripturl:true */
  grunt.registerTask('test', [
    'jshint',
    'connect:dev',
    'jade',
    'mocha:unit'
  ]);

  grunt.registerTask('coverage', [
    'blanket',
    'connect:dev',
    'mocha:coverage'
  ]);

  grunt.registerTask('test:watch', [
    'connect:dev',
    'watch:test'
  ]);
};
