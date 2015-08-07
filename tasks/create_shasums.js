var childProcess = require('child_process');
var Promise = require('bluebird');
var fs = require('fs');
var readdir = Promise.promisify(fs.readdir);
var exec = Promise.promisify(childProcess.exec);
var _ = require('lodash');
module.exports = function (grunt) {

  grunt.registerTask('create_shasums', function () {
    var targetDir = grunt.config.get('target');

    readdir(targetDir)
    .map(function (archive) {
      // only sha the archives
      if (!archive.match(/\.zip$|\.tar.gz$/)) return;

      return exec('shasum ' + archive + ' > ' + archive + '.sha1.txt', {
        cwd: targetDir
      });
    })
    .nodeify(this.async());
  });

};
