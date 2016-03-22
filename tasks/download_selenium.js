var _ = require('lodash');
var request = require('request');
var fs = require('fs');
var path = require('path');
var colors = require('ansicolors');
var crypto = require('crypto');
var {spawn} = require('child_process');

module.exports = function (grunt) {
  grunt.registerTask('downloadSelenium', 'Download selenium standalone', function (keepalive) {
    const done = this.async();
    const config = this.options();

    const FILE = config.selenium.path;
    const DIR = path.dirname(config.selenium.path);
    const URL = config.selenium.server + config.selenium.filename;

    function validateDownload(path, expectedHash, success) {
      grunt.log.write('Validating hash...');
      fs.readFile(path, function checkHash(err, data) {
        if (err) grunt.fail.warn(err);

        const calculatedHash = crypto.createHash('md5').update(data).digest('hex');
        if (calculatedHash !== expectedHash) return grunt.fail.warn('Selenium download has an invalid hash');

        grunt.log.writeln('done');
        success();
      });
    }

    function downloadSelenium(success) {
      grunt.log.write(`Downloading ${URL}...`);
      request.get(URL)
      .pipe(fs.createWriteStream(FILE))
      .on('error', function downloadError(err) {
        grunt.fail.warn(err);
      })
      .on('finish', function downloadFinish() {
        grunt.log.writeln('done');
        validateDownload(FILE, config.selenium.md5, success);
      });
    }

    function start() {
      try {
        fs.mkdirSync(DIR);
      } catch (err) {
        if (err && err.code !== 'EEXIST') grunt.fail.warn(err);
      }

      if (fs.existsSync(FILE)) {
        validateDownload(FILE, config.selenium.md5, done);
      } else {
        downloadSelenium(done);
      }
    }

    start();

  });
};
