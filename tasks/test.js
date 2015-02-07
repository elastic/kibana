var _ = require('lodash');
module.exports = function (grunt) {
  function addTestTask(tasks) {
    var testTask = 'mocha:unit';

    if (grunt.option('use-sauce') || process.env.TRAVIS) {
      if (!process.env.SAUCE_ACCESS_KEY) {
        grunt.log.writeln(grunt.log.wordlist([
          '>> SAUCE_ACCESS_KEY not set in env, running with Phantom'
        ], {color: 'yellow'}));
      } else {
        testTask = 'saucelabs-mocha:unit';
      }
    }

    tasks.push('simplemocha:all', testTask);

    return testTask;
  }

  grunt.registerTask('test', function () {
    if (grunt.option('quick')) {
      grunt.task.run('quick-test');
      return;
    }

    var tasks = [
      'jshint:source',
      'jscs:source',
      'maybe_start_kibana',
      'jade',
      'less'
    ];
    addTestTask(tasks);
    if (process.env.TRAVIS) tasks.unshift('esvm:dev');
    grunt.task.run(tasks);
  });

  grunt.registerTask('quick-test', function () {
    var tasks = [
      'maybe_start_kibana'
    ];
    addTestTask(tasks);
    grunt.task.run(tasks);
  });

  grunt.registerTask('coverage', [
    'blanket',
    'maybe_start_kibana',
    'mocha:coverage'
  ]);

  grunt.registerTask('test:watch', [
    'maybe_start_kibana',
    'watch:test'
  ]);
};
