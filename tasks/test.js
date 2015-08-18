var _ = require('lodash');
module.exports = function (grunt) {
  grunt.registerTask('test:server', [ 'simplemocha:all' ]);
  grunt.registerTask('test:browser', [ 'run:testServer', 'karma:unit' ]);

  grunt.registerTask('test:quick', [
    'test:server',
    'test:browser'
  ]);

  grunt.registerTask('test:dev', [
    'run:devTestServer',
    'karma:dev'
  ]);

  grunt.registerTask('test', function (subTask) {
    if (subTask) grunt.fail.fatal(`invalid task "test:${subTask}"`);

    if (grunt.option('quick')) {
      grunt.task.run('test:quick');
      return;
    }

    grunt.task.run(_.compact([
      'eslint:source',
      'test:server',
      'test:browser'
    ]));
  });

  grunt.registerTask('quick-test', ['test:quick']); // historical alias
};
