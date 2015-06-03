var child_process = require('child_process');
var Promise = require('bluebird');
var fs = require('fs');
var readdir = Promise.promisify(fs.readdir);
var exec = Promise.promisify(child_process.exec);
var _ = require('lodash');
module.exports = function (grunt) {
  grunt.registerTask('create_shasums', function () {
    var done = this.async();
    var target = grunt.config.get('target');
    var options = { cwd: target };

    var createShasum = function (filename) {
      var shacmd = 'shasum ' + filename + ' > ' + filename + '.sha1.txt';
      return exec(shacmd, options);
    };

    readdir(target).then(function (files) {
      // Look for all files in the target dir that are not .sha1.txt files
      var artifacts = _(files)
        .reject(function (f) { return /\.sha1\.txt$/.test(f); })
        .value();
      return Promise.map(artifacts, createShasum).finally(done);
    });
  });
};
