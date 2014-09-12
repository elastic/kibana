var _ = require('lodash');
module.exports = function (grunt) {

  var testTask = process.env.TRAVIS ? 'saucelabs-mocha:unit' : 'mocha:unit';

  grunt.registerTask('test', [
    'ruby_server',
    'maybe_start_server',
    'jade',
    testTask,
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
