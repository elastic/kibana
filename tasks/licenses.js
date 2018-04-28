import { getInstalledPackages } from '../src/dev/npm';
import {
  assertLicensesValid,
  LICENSE_WHITELIST,
  LICENSE_OVERRIDES,
} from '../src/dev/license_checker';

export default function licenses(grunt) {
  grunt.registerTask('licenses', 'Checks dependency licenses', async function () {
    const done = this.async();

    try {
      assertLicensesValid({
        packages: await getInstalledPackages({
          directory: grunt.config.get('root'),
          licenseOverrides: LICENSE_OVERRIDES
        }),
        validLicenses: LICENSE_WHITELIST
      });
      done();
    } catch (err) {
      grunt.fail.fatal(err);
      done(err);
    }
  });
}
