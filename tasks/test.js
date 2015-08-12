var _ = require('lodash');
module.exports = function (grunt) {
  grunt.registerTask('test', function () {
    if (grunt.option('quick')) {
      grunt.task.run('quick-test');
      return;
    }

    grunt.task.run(_.compact([
      'eslint:source',
      'maybeStartTestServer',
      'simplemocha:all',
      'karma:unit'
    ]));
  });

  grunt.registerTask('quick-test', function () {
    grunt.task.run([
      'maybeStartTestServer',
      'simplemocha:all',
      'karma:unit'
    ]);
  });

  grunt.registerTask('test:watch', [
    'maybeStartTestServer',
    'watch:test'
  ]);
};
