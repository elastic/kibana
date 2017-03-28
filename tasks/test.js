import _, { keys } from 'lodash';

import visualRegression from '../utilities/visual_regression';

module.exports = function (grunt) {
  grunt.registerTask(
    'test:visualRegression:buildGallery',
    'Compare screenshots and generate diff images.',
    function () {
      const done = this.async();
      visualRegression.run(done);
    }
  );

  grunt.registerTask('test:server', [
    'checkPlugins',
    'esvm:test',
    'simplemocha:all',
    'esvm_shutdown:test',
  ]);

  grunt.registerTask('test:browser', [
    'checkPlugins',
    'run:testServer',
    'karma:unit',
  ]);

  grunt.registerTask('test:browser-ci', () => {
    const ciShardTasks = keys(grunt.config.get('karma'))
      .filter(key => key.startsWith('ciShard-'))
      .map(key => `karma:${key}`);

    grunt.log.ok(`Running UI tests in ${ciShardTasks.length} shards`);

    grunt.task.run([
      'run:testServer',
      ...ciShardTasks
    ]);
  });

  grunt.registerTask('test:coverage', [ 'run:testCoverageServer', 'karma:coverage' ]);

  grunt.registerTask('test:quick', [
    'test:server',
    'test:ui',
    'test:jest',
    'test:browser',
    'test:api'
  ]);

  grunt.registerTask('test:dev', [
    'checkPlugins',
    'run:devTestServer',
    'karma:dev'
  ]);

  grunt.registerTask('test:ui', [
    'checkPlugins',
    'esvm:ui',
    'run:testUIServer',
    'clean:screenshots',
    'functionalTestRunner',
    'esvm_shutdown:ui',
    'stop:testUIServer'
  ]);

  grunt.registerTask('test:ui:server', [
    'checkPlugins',
    'esvm:ui',
    'run:testUIDevServer:keepalive'
  ]);

  grunt.registerTask('test:ui:runner', [
    'checkPlugins',
    'clean:screenshots',
    'functionalTestRunner'
  ]);

  grunt.registerTask('test:api', [
    'esvm:ui',
    'run:apiTestServer',
    'simplemocha:api',
    'esvm_shutdown:ui',
    'stop:apiTestServer'
  ]);

  grunt.registerTask('test:api:server', [
    'esvm:ui',
    'run:apiTestServer:keepalive'
  ]);

  grunt.registerTask('test:api:runner', [
    'simplemocha:api'
  ]);

  grunt.registerTask('test', subTask => {
    if (subTask) grunt.fail.fatal(`invalid task "test:${subTask}"`);

    grunt.task.run(_.compact([
      !grunt.option('quick') && 'eslint:source',
      'licenses',
      'test:quick'
    ]));
  });

  grunt.registerTask('quick-test', ['test:quick']); // historical alias
};
