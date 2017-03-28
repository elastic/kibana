import { resolve } from 'path';

import { createFunctionalTestRunner } from '../src/functional_test_runner';
import { createToolingLog } from '../src/utils';

export default function (grunt) {
  grunt.registerTask('functionalTestRunner', function () {
    const log = createToolingLog(grunt.option('--debug') ? 'debug' : 'info');
    log.pipe(process.stdout);

    const functionalTestRunner = createFunctionalTestRunner({
      log,
      configFile: resolve(__dirname, '../test/functional/config.js'),
    });

    const callback = this.async();
    functionalTestRunner.run()
      .then(failureCount => {
        if (failureCount) {
          grunt.fail.error(`${failureCount} test failures`);
          return;
        }

        callback();
      })
      .catch(err => {
        grunt.log.error(err.stack);
        callback(err);
      });
  });
}
