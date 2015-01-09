var _ = require('lodash');
var zlib = require('zlib');
var tar = require('tar');
var request = require('request');
var mkdirp = require('mkdirp');
var fs = require('fs');
var join = require('path').join;
var filesPatern = _.template('node-v<%- version %>-<%- platform %>.tar.gz');
var urlPattern = _.template('http://nodejs.org/dist/v<%- version %>/<%- file %>');
var async = require('async');

module.exports = function (grunt) {
  grunt.registerTask('download_node_binaries', 'Download the node.js binaries', function () {
    var done = this.async();
    var platforms = _.without(grunt.config.get('platforms'), 'windows');
    var buildPath = grunt.config.get('build');
    var version = grunt.config.get('nodeVersion');

    var downloadWindows = function (cb) {
      var dest = join(buildPath, 'node_binaries', 'windows');
      var url = urlPattern({ version: version, file: 'nodex.exe'});
      mkdirp(dest, function (err) {
        if (err) return cb(err);
        var out = fs.createWriteStream(join(dest, 'node.exe'));
        out.on('close', cb).on('error', cb);
        var req = request.get(url);
        req.pipe(out);
      });
    };

    var download = function (platform, cb) {
      var dest = join(buildPath, 'node_binaries', platform);
      var file = filesPatern({ version: version, platform: platform });
      var url = urlPattern({ version: version, file: file });
      mkdirp(dest, function (err) {
        if (err) return cb(err);
        var unzip = zlib.createGunzip();
        var out = tar.Extract({ path: dest, strip: 1 });
        out.on('close', cb).on('error', cb);
        var req = request.get(url);
        req.pipe(unzip).pipe(out);
      });
    };

    async.each(platforms, download, function (err) {
      if (err) return done(err);
      downloadWindows(done);
    });

  });
};

