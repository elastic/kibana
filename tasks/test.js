import _, { keys } from 'lodash';

import { run } from '../utilities/visual_regression';

module.exports = function (grunt) {
  grunt.registerTask(
    'test:visualRegression:buildGallery',
    'Compare screenshots and generate diff images.',
    function () {
      const done = this.async();
      run(done);
    }
  );

  grunt.registerTask('test:server', [
    'checkPlugins',
    'run:mocha',
  ]);

  grunt.registerTask('test:browser', [
    'checkPlugins',
    'run:browserTestServer',
    'karma:unit',
  ]);

  grunt.registerTask('test:browser-ci', () => {
    const ciShardTasks = keys(grunt.config.get('karma'))
      .filter(key => key.startsWith('ciShard-'))
      .map(key => `karma:${key}`);

    grunt.log.ok(`Running UI tests in ${ciShardTasks.length} shards`);

    grunt.task.run([
      'run:browserTestServer',
      ...ciShardTasks
    ]);
  });

  grunt.registerTask('test:coverage', [ 'run:testCoverageServer', 'karma:coverage' ]);

  grunt.registerTask('test:quick', [
    'test:server',
    'test:ui',
    'test:jest',
    'test:jest_integration',
    'test:projects',
    'test:browser',
    'run:apiIntegrationTests'
  ]);

  grunt.registerTask('test:dev', [
    'checkPlugins',
    'run:devBrowserTestServer',
    'karma:dev'
  ]);

  grunt.registerTask('test:ui', [
    'checkPlugins',
    'run:functionalTests',
  ]);

  grunt.registerTask('test:uiRelease', [
    'checkPlugins',
    'run:functionalTestsRelease',
  ]);

  grunt.registerTask('test:ui:server', [
    'checkPlugins',
    'run:functionalTestsDevServer',
  ]);

  grunt.registerTask('test', subTask => {
    if (subTask) grunt.fail.fatal(`invalid task "test:${subTask}"`);

    grunt.task.run(_.compact([
      !grunt.option('quick') && 'run:eslint',
      'licenses',
      'test:quick',
      'verifyTranslations',
    ]));
  });

  grunt.registerTask('quick-test', ['test:quick']); // historical alias

  grunt.registerTask('test:projects', function () {
    const done = this.async();
    runProjectsTests().then(done, done);
  });

  function runProjectsTests() {
    const serverCmd = {
      cmd: 'yarn',
      args: ['kbn', 'run', 'test', '--exclude', 'kibana', '--oss', '--skip-kibana-extra'],
      opts: { stdio: 'inherit' }
    };

    return new Promise((resolve, reject) => {
      grunt.util.spawn(serverCmd, (error, result, code) => {
        if (error || code !== 0) {
          const error = new Error(`projects tests exited with code ${code}`);
          grunt.fail.fatal(error);
          reject(error);
          return;
        }

        grunt.log.writeln(result);
        resolve();
      });
    });
  }
};
