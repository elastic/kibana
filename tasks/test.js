var _ = require('lodash');
module.exports = function (grunt) {
  grunt.registerTask('test', function () {
    if (grunt.option('quick')) {
      grunt.task.run('quick-test');
      return;
    }

    var tasks = [
      'licenses',
      'jshint:source',
      'jscs:source',
      'maybe_start_kibana',
      'jade',
      'less:build',
      'simplemocha:all',
      'mocha:unit'
    ];

    if (process.env.TRAVIS) tasks.unshift('esvm:dev');

    grunt.task.run(tasks);
  });

  grunt.registerTask('quick-test', function () {
    grunt.task.run([
      'maybe_start_kibana',
      'simplemocha:all',
      'mocha:unit'
    ]);
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
