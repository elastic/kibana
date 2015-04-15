var _ = require('lodash');
var zlib = require('zlib');
var tar = require('tar');
var request = require('request');
var mkdirp = require('mkdirp');
var fs = require('fs');
var join = require('path').join;
var filesPatern = _.template('node-v<%- version %>-<%- platform %>.tar.gz');
var urlPattern = _.template('http://nodejs.org/dist/v<%- version %>/<%- file %>');
var Promise = require('bluebird');

module.exports = function (grunt) {
  grunt.registerTask('download_node_binaries', 'Download the node.js binaries', function () {
    var platforms = _.without(grunt.config.get('platforms'), 'windows');
    var rootPath = grunt.config.get('root');
    var version = grunt.config.get('nodeVersion');

    var handle404 = function (response) {
      if (response.statusCode !== 200) {
        throw new Error(response.request.href + ' failed with a ' + response.statusCode);
      }
    };

    var downloadWindows = function (cb) {
      return new Promise(function (resolve, reject) {
        var dest = join(rootPath, '.node_binaries', 'windows');
        fs.stat(dest, function (err) {
          if (!err) return resolve(); // skip downloading if we already have them
          var url = urlPattern({ version: version, file: 'node.exe'});
          mkdirp(dest, function (err) {
            if (err) return reject(err);
            var out = fs.createWriteStream(join(dest, 'node.exe'));
            out.on('close', resolve).on('error', reject);
            var req = request.get(url);
            req.on('response', handle404);
            req.pipe(out);
          });
        });
      });
    };

    var download = function (platform) {
      return new Promise(function (resolve, reject) {
        var dest = join(rootPath, '.node_binaries', platform);
        fs.stat(dest, function (err) {
          if (!err) return resolve(); // skip downloading if we already have them
          var file = filesPatern({ version: version, platform: platform });
          var url = urlPattern({ version: version, file: file });
          mkdirp(dest, function (err) {
            if (err) return reject(err);
            var unzip = zlib.createGunzip();
            var out = tar.Extract({ path: dest, strip: 1 });
            out.on('close', resolve).on('error', reject);
            var req = request.get(url);
            req.on('response', handle404);
            req.pipe(unzip).pipe(out);
          });
        });
      });
    };

    return Promise.map(platforms, download).then(downloadWindows).nodeify(this.async());
  });
};

