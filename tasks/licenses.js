import {
  getInstalledPackages,
  assertLicensesValid
} from './lib';

export default function licenses(grunt) {
  grunt.registerTask('licenses', 'Checks dependency licenses', async function () {
    const done = this.async();

    try {
      const options = this.options({
        licenses: [],
        overrides: {}
      });

      assertLicensesValid({
        packages: await getInstalledPackages({
          directory: grunt.config.get('root'),
          licenseOverrides: options.overrides
        }),
        validLicenses: options.licenses
      });
      done();
    } catch (err) {
      grunt.fail.fatal(err);
      done(err);
    }
  });
}
