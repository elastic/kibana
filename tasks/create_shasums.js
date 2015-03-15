var createPackages = require('./create_packages');
var Promise = require('bluebird');
var exec = createPackages.exec;
var getBaseNames = createPackages.getBaseNames;
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

    var filenames = _(getBaseNames(grunt))
      .map(function (basename) {
        return [ basename + '.tar.gz', basename + '.zip' ];
      })
      .flatten()
      .value();

    Promise.map(filenames, createShasum).finally(done);

  });
};
