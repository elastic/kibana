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
    var archiveName = join(target, packageName + '-' + version);
    var distPath = join(grunt.config.get('build'), 'dist');

    var tgzCmd = 'tar -zcvf ' + archiveName + '.tar.gz kibana-' + version;
    var zipCmd = 'zip -r ' + archiveName + '.zip kibana-' + version;

    var options = { cwd: distPath };

    mkdirp.mkdirpAsync(target)
      .then(function (arg) {
        return exec(tgzCmd, options);
      })
      .then(function (arg) {
        return exec(zipCmd, options);
      })
      .finally(done);

  });
};
