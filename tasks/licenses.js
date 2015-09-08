var _ = require('lodash');
var npm = require('npm');
var npmLicense = require('license-checker');

module.exports = function (grunt) {
  grunt.registerTask('licenses', 'Checks dependency licenses', function () {

    var config = this.options();

    var done = this.async();

    var result = {};
    var options = { start: process.cwd(), json: true };
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
      }());
      return pkgInfo;
    }

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

          var licenseStats = _.map(productionDependencies, processPackage);
          var invalidLicenses = _.filter(licenseStats, function (pkg) { return !pkg.valid; });

          if (!grunt.option('only-invalid')) {
            grunt.log.debug(JSON.stringify(licenseStats, null, 2));
          }


          if (invalidLicenses.length) {
            grunt.log.debug(JSON.stringify(invalidLicenses, null, 2));
            grunt.fail.warn(
              'Non-confirming licenses: ' + _.pluck(invalidLicenses, 'name').join(', '),
              invalidLicenses.length
            );
          }

          done();
        });
      });
    });


  });
};
