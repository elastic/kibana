var _ = require('lodash');
module.exports = function (grunt) {
  grunt.registerTask('test:server', [ 'esvm:test', 'simplemocha:all', 'esvm_shutdown:test' ]);
  grunt.registerTask('test:browser', [ 'run:testServer', 'karma:unit' ]);
  grunt.registerTask('test:coverage', [ 'run:testCoverageServer', 'karma:coverage' ]);

  grunt.registerTask('test:quick', [
    'test:server',
    'test:ui',
    'test:browser'
  ]);

  grunt.registerTask('test:dev', [
    'run:devTestServer',
    'karma:dev'
  ]);

  grunt.registerTask('test:ui', [
    'esvm:ui',
    'run:testUIServer',
    'run:chromeDriver',
    'intern:dev',
    'esvm_shutdown:ui',
    'stop:chromeDriver',
    'stop:testUIServer'
  ]);

  grunt.registerTask('test:ui:server', [
    'esvm:ui',
    'run:testUIServer',
    'run:devChromeDriver:keepalive'
  ]);

  grunt.registerTask('test:ui:runner', [
    'intern:dev'
  ]);

  grunt.registerTask('test', function (subTask) {
    if (subTask) grunt.fail.fatal(`invalid task "test:${subTask}"`);

    grunt.task.run(_.compact([
      !grunt.option('quick') && 'eslint:source',
      'test:quick'
    ]));
  });

  grunt.registerTask('quick-test', ['test:quick']); // historical alias
};
