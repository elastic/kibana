import _, { keys } from 'lodash';
import fs from 'fs';
import path from 'path';

const visualRegression = require('../utilities/visual_regression');

module.exports = function (grunt) {
  grunt.registerTask('checkPlugins', 'Checks for plugins which may disrupt tests', function checkPlugins() {
    const done = this.async();
    const pluginsDir = path.resolve('./plugins/');

    fs.readdir(pluginsDir, (err, files) => {
      if (!files) {
        return done();
      }

      const plugins = files.filter(file => {
        return fs.statSync(path.join(pluginsDir, file)).isDirectory();
      });

      if (plugins.length) {
        grunt.log.error('===================================================================================================');
        plugins.forEach(plugin => {
          grunt.log.error(`The ${plugin} plugin may disrupt the test process. Consider removing it and re-running your tests.`);
        });
        grunt.log.error('===================================================================================================');
      }

      done();
    });
  });

  grunt.registerTask('test:visualRegression', [
    'intern:visualRegression:takeScreenshots',
    'test:visualRegression:buildGallery'
  ]);

  grunt.registerTask('test:visualRegression:takeScreenshots', [
    'clean:screenshots',
    'intern:visualRegression'
  ]);

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
    'run:chromeDriver',
    'clean:screenshots',
    'intern:dev',
    'esvm_shutdown:ui',
    'stop:chromeDriver',
    'stop:testUIServer'
  ]);

  grunt.registerTask('test:ui:server', [
    'esvm:ui',
    'run:testUIDevServer:keepalive'
  ]);

  grunt.registerTask('test:ui:runner', [
    'checkPlugins',
    'clean:screenshots',
    'run:devChromeDriver',
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
