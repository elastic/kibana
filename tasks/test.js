var _ = require('lodash');
module.exports = function (grunt) {
  grunt.registerTask('test', function () {
    if (grunt.option('quick')) {
      grunt.task.run('quick-test');
      return;
    }

    grunt.task.run(_.compact([
      process.env.TRAVIS && 'esvm:dev',
      'licenses',
      'jshint:source',
      'jscs:source',
      'maybeStartKibana',
      'simplemocha:all',
      'mocha:unit'
    ]));
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
