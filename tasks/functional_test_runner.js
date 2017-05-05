import { resolve } from 'path';

import { createFunctionalTestRunner } from '../src/functional_test_runner';
import { createToolingLog } from '../src/utils';

export default function (grunt) {
  grunt.registerTask('functionalTestRunner', function () {
    const log = createToolingLog('debug');
    log.pipe(process.stdout);

    const functionalTestRunner = createFunctionalTestRunner({
      log,
      configFile: resolve(__dirname, '../test/functional/config.js'),
    });

    const callback = this.async();
    functionalTestRunner.run()
      .then(failureCount => {
        if (failureCount) {
          grunt.fail.warn(`${failureCount} test failures`);
          return;
        }

        callback();
      })
      .catch(err => {
        grunt.fail.warn(err.stack);
        callback(err);
      });
  });
}
