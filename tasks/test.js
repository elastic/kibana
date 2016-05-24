var _ = require('lodash');
module.exports = function (grunt) {
  grunt.registerTask('test:server', [ 'esvm:test', 'simplemocha:all', 'esvm_shutdown:test' ]);
  grunt.registerTask('test:browser', [ 'run:testServer', 'karma:unit' ]);
  grunt.registerTask('test:coverage', [ 'run:testCoverageServer', 'karma:coverage' ]);

  grunt.registerTask('test:quick', [
    'test:server',
    'test:ui',
    'test:browser',
    'test:api'
  ]);

  grunt.registerTask('test:dev', [
    'run:devTestServer',
    'karma:dev'
  ]);

  grunt.registerTask('test:ui', [
    'esvm:ui',
    'run:testUIServer',
    'downloadSelenium',
    'run:seleniumServer',
    'intern:dev',
    'esvm_shutdown:ui',
    'stop:seleniumServer',
    'stop:testUIServer'
  ]);

  grunt.registerTask('test:ui:server', [
    'esvm:ui',
    'run:testUIServer',
    'downloadSelenium',
    'run:devSeleniumServer:keepalive'
  ]);

  grunt.registerTask('test:ui:runner', [
    'intern:dev'
  ]);

  grunt.registerTask('test:api', [
    'esvm:ui',
    'run:apiTestServer',
    'intern:api',
    'esvm_shutdown:ui',
    'stop:apiTestServer'
  ]);

  grunt.registerTask('test:api:server', [
    'esvm:ui',
    'run:apiTestServer:keepalive'
  ]);

  grunt.registerTask('test:api:runner', [
    'intern:api'
  ]);

  grunt.registerTask('test', function (subTask) {
    if (subTask) grunt.fail.fatal(`invalid task "test:${subTask}"`);

    grunt.task.run(_.compact([
      !grunt.option('quick') && 'eslint:source',
      'licenses',
      'test:quick'
    ]));
  });

  grunt.registerTask('quick-test', ['test:quick']); // historical alias
};
