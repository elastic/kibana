// Lint and build CSS
module.exports = function (grunt) {
  grunt.registerTask('default', ['jshint:source', 'jscs:source', 'less']);
};