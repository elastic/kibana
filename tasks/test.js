var _ = require('lodash');
module.exports = function (grunt) {
  grunt.registerTask('test', function () {
    if (grunt.option('quick')) {
      grunt.task.run('quick-test');
      return;
    }

    grunt.task.run(_.compact([
      'eslint:source',
      'simplemocha:all',
      'run:testServer',
      'karma:ci'
    ]));
  });

  grunt.registerTask('quick-test', [
    'simplemocha:all',
    'run:testServer',
    'karma:ci'
  ]);

  grunt.registerTask('test:dev', [
    'run:devTestServer',
    'karma:dev'
  ]);

  grunt.registerTask('test:watch', [
    'run:testServer',
    'watch:test'
  ]);
};
