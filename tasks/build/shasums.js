import { promisify } from 'bluebird';
const readdir = promisify(require('fs').readdir);
const exec = promisify(require('child_process').exec);
const platform = require('os').platform();
const cmd = /^win/.test(platform) ? 'sha1sum ' : 'shasum ';

module.exports = function (grunt) {
  grunt.registerTask('_build:shasums', function () {
    const targetDir = grunt.config.get('target');

    // for when shasums is run but archives and ospackages was not
    grunt.file.mkdir(targetDir);

    readdir(targetDir)
    .map(function (archive) {
      // only sha the archives and packages
      if (!archive.match(/\.zip$|\.tar.gz$|\.deb$|\.rpm$/)) return;

      return exec(cmd + archive + ' > ' + archive + '.sha1.txt', {
        cwd: targetDir
      });
    })
    .nodeify(this.async());
  });

};
