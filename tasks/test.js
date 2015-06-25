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
      'maybeStartKibana',
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
      'maybeStartKibana',
      'simplemocha:all',
      'mocha:unit'
    ]);
  });

  grunt.registerTask('coverage', [
    'blanket',
    'maybeStartKibana',
    'mocha:coverage'
  ]);

  grunt.registerTask('test:watch', [
    'maybeStartKibana',
    'watch:test'
  ]);
};
