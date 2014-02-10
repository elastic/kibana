module.exports = function (grunt) {
  /* jshint scripturl:true */
  grunt.registerTask('test', [
    'connect:test',
    'mocha:unit'
  ]);
};