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

    const SELENIUM_FILE_PATH = path.join(config.selenium.directory, config.selenium.filename);
    const SELENIUM_DOWNLOAD_URL = config.selenium.server + config.selenium.filename;

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
      grunt.log.write(`Downloading ${SELENIUM_DOWNLOAD_URL}...`);
      request.get(SELENIUM_DOWNLOAD_URL)
      .pipe(fs.createWriteStream(SELENIUM_FILE_PATH))
      .on('error', function downloadError(err) {
        grunt.fail.warn(err);
      })
      .on('finish', function downloadFinish() {
        grunt.log.writeln('done');
        validateDownload(SELENIUM_FILE_PATH, config.selenium.md5, success);
      });
    }

    function start() {
      try {
        fs.mkdirSync(config.selenium.directory);
      } catch (err) {
        if (err && err.code !== 'EEXIST') grunt.fail.warn(err);
      }

      if (fs.existsSync(SELENIUM_FILE_PATH)) {
        validateDownload(SELENIUM_FILE_PATH, config.selenium.md5, done);
      } else {
        downloadSelenium(done);
      }
    }

    start();

  });
};
