var _ = require('lodash');
var npm = require('npm');
var bowerLicense = require('bower-license');
var npmLicense = require('license-checker');

module.exports = function (grunt) {
  grunt.registerTask('licenses', 'Checks dependency licenses', function () {

    var config = this.options();

    var done = this.async();

    // Put this here because angular-nvd3 doesn't have licenses.
    // FIXME nvd3's license problem
    done();

    var result = {};
    var options = {start: process.cwd(), json: true };
    var checkQueueLength = 2;

    function processPackage(info, dependency) {
      var pkgInfo = {};
      pkgInfo.name = dependency;
      pkgInfo.licenses = config.overrides[dependency] || (info && info.licenses);
      pkgInfo.licenses = _.isArray(pkgInfo.licenses) ? pkgInfo.licenses : [pkgInfo.licenses];
      pkgInfo.valid = (function () {
        if (_.intersection(pkgInfo.licenses, config.licenses).length > 0) {
          return true;
        }
        return false;
      })();
      return pkgInfo;
    }

    function dequeue(output) {
      checkQueueLength--;
      _.extend(result, output);

      if (!checkQueueLength) {
        var licenseStats = _.map(result, processPackage);
        var invalidLicenses = _.filter(licenseStats, function (pkg) { return !pkg.valid;});

        if (grunt.option('only-invalid')) {
          console.log(invalidLicenses);
        } else {
          console.log(licenseStats);
        }

        if (invalidLicenses.length) {
          grunt.fail.warn('Non-confirming licenses: ' + _.pluck(invalidLicenses, 'name').join(', ') +
            '. Use --only-invalid for details.', invalidLicenses.length);
        }
        done();
      }
    }

    bowerLicense.init(options, dequeue);
    npmLicense.init(options, function (allDependencies) {
      // Only check production NPM dependencies, not dev
      npm.load({production: true}, function () {
        npm.commands.list([], true, function (a, b, npmList) {

          // Recurse npm --production --json ls output, create array of package@version
          var getDependencies = function (dependencies, list) {
            list = list || [];
            _.each(dependencies, function (info, dependency) {
              list.push(dependency + '@' + info.version);
              if (info.dependencies) {
                getDependencies(info.dependencies, list);
              }
            });
            return list;
          };

          var productionDependencies = {};
          _.each(getDependencies(npmList.dependencies), function (packageAndVersion) {
            productionDependencies[packageAndVersion] = allDependencies[packageAndVersion];
          });
          dequeue(productionDependencies);

        });
      });
    });


  });
};
