import _ from 'lodash';
import { fromNode } from 'bluebird';
import npmLicense from 'license-checker';

export default function licenses(grunt) {
  grunt.registerTask('licenses', 'Checks dependency licenses', async function () {
    const config = this.options();
    const done = this.async();

    const options = {
      start: process.cwd(),
      production: true,
      json: true
    };

    const packages = await fromNode(cb => {
      npmLicense.init(options, result => {
        cb(undefined, result);
      });
    });

    /**
     * Licenses for a package by name with overrides
     *
     * @param {String} name
     * @return {Array}
     */

    function licensesForPackage(name) {
      let licenses = packages[name].licenses;

      if (config.overrides.hasOwnProperty(name)) {
        licenses = config.overrides[name];
      }

      return typeof licenses === 'string' ? [licenses] : licenses;
    }

    /**
     * Determine if a package has a valid license
     *
     * @param {String} name
     * @return {Boolean}
     */

    function isInvalidLicense(name) {
      const licenses = licensesForPackage(name);

      // verify all licenses for the package are in the config
      return _.intersection(licenses, config.licenses).length < licenses.length;
    }

    // Build object containing only invalid packages
    const invalidPackages = _.pick(packages, (pkg, name) => {
      return isInvalidLicense(name);
    });

    if (Object.keys(invalidPackages).length) {
      const execSync = require('child_process').execSync;
      const names = Object.keys(invalidPackages);

      // Uses npm ls to create tree for package locations
      const tree = execSync(`npm ls ${names.join(' ')}`);

      grunt.log.debug(JSON.stringify(invalidPackages, null, 2));
      grunt.fail.warn(
        `Non-confirming licenses:\n ${names.join('\n ')}\n\n${tree}`,
        invalidPackages.length
      );
    }

    done();
  });
}
