var child_process = require('child_process');
var Promise = require('bluebird');
var join = require('path').join;
var mkdirp = Promise.promisifyAll(require('mkdirp'));

var exec = Promise.promisify(child_process.exec);

var getBaseNames = function (grunt) {
  var packageName = grunt.config.get('pkg.name');
  var version = grunt.config.get('pkg.version');
  var platforms = grunt.config.get('platforms');
  return platforms.map(function (platform) {
    return packageName + '-' + version + '-' + platform;
  });
};

function createPackages(grunt) {
  grunt.registerTask('create_packages', function () {
    var done = this.async();
    var target = grunt.config.get('target');
    var distPath = join(grunt.config.get('build'), 'dist');

    var createPackage = function (name) {
      var options = { cwd: distPath };
      var archiveName = join(target, name);
      var tgzCmd = 'tar -zcf ' + archiveName + '.tar.gz ' + name;
      var zipCmd = 'zip -rq ' + archiveName + '.zip ' + name;

      if (/windows/.test(name)) {
        zipCmd = 'zip -rq -ll ' + archiveName + '.zip ' + name;
      }

      return mkdirp.mkdirpAsync(target)
        .then(function (arg) {
          return exec(tgzCmd, options);
        })
        .then(function (arg) {
          return exec(zipCmd, options);
        });
    };

    Promise.map(getBaseNames(grunt), createPackage).finally(done);

  });
}

module.exports = createPackages;
createPackages.exec = exec;
createPackages.getBaseNames = getBaseNames;
