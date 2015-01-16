var child_process = require('child_process');
var Promise = require('bluebird');
var exec = Promise.promisify(child_process.exec);
var join = require('path').join;
var mkdirp = Promise.promisifyAll(require('mkdirp'));

module.exports = function (grunt) {
  grunt.registerTask('create_packages', function () {
    var done = this.async();
    var target = grunt.config.get('target');
    var packageName = grunt.config.get('pkg.name');
    var version = grunt.config.get('pkg.version');
    var distPath = join(grunt.config.get('build'), 'dist');
    var platforms = grunt.config.get('platforms');

    var createPackage = function (platform) {
      var options = { cwd: distPath };
      var name = packageName + '-' + version + '-' + platform;
      var archiveName = join(target, name);
      var tgzCmd = 'tar -zcf ' + archiveName + '.tar.gz ' + name;
      var zipCmd = 'zip -rq ' + archiveName + '.zip ' + name;

      if (platform === 'windows') {
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

    Promise.map(platforms, createPackage).finally(done);

  });
};
