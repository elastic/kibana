var { promisify } = require('bluebird');
var readdir = promisify(require('fs').readdir);
var exec = promisify(require('child_process').exec);

module.exports = function (grunt) {
  grunt.registerTask('_build:shasums', function () {
    var targetDir = grunt.config.get('target');

    // for when shasums is run but archives and ospackages was not
    grunt.file.mkdir(targetDir);

    readdir(targetDir)
    .map(function (archive) {
      // only sha the archives and packages
      if (!archive.match(/\.zip$|\.tar.gz$|\.deb$|\.rpm$/)) return;

      return exec('shasum ' + archive + ' > ' + archive + '.sha1.txt', {
        cwd: targetDir
      });
    })
    .nodeify(this.async());
  });

};
