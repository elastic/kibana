import moment from 'moment';
import { createFunctionalTestRunner } from '../src/functional_test_runner';
import { createToolingLog, createMapStream } from '../src/utils';

export default function (grunt) {
  grunt.registerMultiTask('functional_test_runner', 'run tests with the functional test runner', function () {
    const {
      logLevel,
      configFile,
      configOverrides
    } = this.options();

    const log = createToolingLog(logLevel);
    log
      .pipe(createMapStream(line => {
        return `${moment().format('hh:mm:ss.SSS')} ${line}`;
      }))
      .pipe(process.stdout);

    const functionalTestRunner = createFunctionalTestRunner({
      log,
      configFile,
      configOverrides
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
