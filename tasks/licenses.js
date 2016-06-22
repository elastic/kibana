import _ from 'lodash';
import {
  fromNode,
} from 'bluebird';
import npm from 'npm';
import npmLicense from 'license-checker';

export default function licenses(grunt) {
  grunt.registerTask('licenses', 'Checks dependency licenses', async function () {
    const config = this.options();
    const done = this.async();

    const result = {};
    const options = { start: process.cwd(), json: true };
    const checkQueueLength = 2;

    function getLicenses(dependency) {
      if (config.overrides[dependency.name]) {
        return config.overrides[dependency.name];
      }

      if (dependency && dependency.licenses) {
        return _.flatten([dependency.licenses]);
      }
    }

    function processPackage(dependency) {
      const pkgInfo = Object.assign({}, dependency);
      pkgInfo.licenses = getLicenses(dependency);
      pkgInfo.valid = (function () {
        if (_.intersection(pkgInfo.licenses, config.licenses).length > 0) {
          return true;
        }
        return false;
      }());
      return pkgInfo;
    }

    const allDependencies = await fromNode(cb => {
      npmLicense.init(options, result => {
        cb(undefined, result);
      });
    });

    // Only check production NPM dependencies, not dev
    await fromNode(cb => npm.load({production: true}, cb));

    const npmList = await fromNode(cb => {
      npm.commands.list([], true, (a, b, npmList) => cb(undefined, npmList));
    });

    // Recurse npm --production --json ls output, create array of dependency
    // objects, each with a name prop formatted as 'package@version' and a
    // path prop leading back to the root dependency.
    function getDependencies(dependencies, path, list = []) {
      Object.keys(dependencies).forEach(name => {
        const dependency = dependencies[name];
        const newPath = path ? `${path} -> ${dependency.from}` : dependency.from;
        list.push({
          path: newPath,
          name: name + '@' + dependency.version
        });

        if (dependency.dependencies) {
          getDependencies(dependency.dependencies, newPath, list);
        }
      });
      return list;
    };

    const productionDependencies = {};
    getDependencies(npmList.dependencies).forEach(dependency => {
      productionDependencies[dependency.name] =
        Object.assign({}, allDependencies[dependency.name], dependency);
    });

    const licenseStats = _.map(productionDependencies, processPackage);
    const invalidLicenses = licenseStats.filter(pkg => !pkg.valid);

    if (!grunt.option('only-invalid')) {
      grunt.log.debug(JSON.stringify(licenseStats, null, 2));
    }

    if (invalidLicenses.length) {
      grunt.log.debug(JSON.stringify(invalidLicenses, null, 2));
      grunt.fail.warn(
        `Non-confirming licenses:\n ${_.pluck(invalidLicenses, 'path').join('\n')}`,
        invalidLicenses.length
      );
    }

    done();
  });
};
