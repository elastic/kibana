var _ = require('lodash');
module.exports = function (grunt) {
  /* jshint scripturl:true */
  grunt.registerTask('test', [
    'ruby_server',
    'maybe_start_server',
    'jade',
    'mocha:unit',
    'jshint'
  ]);

  grunt.registerTask('coverage', [
    'blanket',
    'ruby_server',
    'maybe_start_server',
    'mocha:coverage'
  ]);

  grunt.registerTask('test:watch', [
    'ruby_server',
    'maybe_start_server',
    'watch:test'
  ]);
};
