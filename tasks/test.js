var _ = require('lodash');
module.exports = function (grunt) {


  grunt.registerTask('test', function () {
    if (process.env.TRAVIS && !process.env.SAUCE_ACCESS_KEY) {
      grunt.fail.fatal('SAUCE_ACCESS_KEY not set in env, can not run tests on Sauce Labs');
    }

    var testTask = process.env.TRAVIS ? 'saucelabs-mocha:unit' : 'mocha:unit';

    var tasks = [
      'jshint',
      'ruby_server',
      'maybe_start_server',
      'jade',
      'less',
      testTask
    ];
    grunt.task.run(tasks);
  });

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
