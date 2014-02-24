module.exports = function (grunt) {
  /* jshint scripturl:true */
  grunt.registerTask('test', [
    'connect:test',
    'jade:test',
    'mocha:unit'
  ]);

  grunt.registerTask('test:watch', [
    'connect:test',
    'watch:test'
  ]);
};
