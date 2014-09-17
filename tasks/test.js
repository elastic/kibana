var _ = require('lodash');
module.exports = function (grunt) {


  grunt.registerTask('test', function () {
    var testTask = 'mocha:unit';
    if (process.env.TRAVIS && !process.env.SAUCE_ACCESS_KEY) {
      grunt.log.writeln(grunt.log.wordlist([
        '>> SAUCE_ACCESS_KEY not set in env, running with Phantom'
      ], {color: 'yellow'}));
    } else {
      testTask = 'saucelabs-mocha:unit';
    }

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
