var _ = require('lodash');
var request = require('request');
var fs = require('fs');
var path = require('path');
var colors = require('ansicolors');
var crypto = require('crypto');
var {spawn} = require('child_process');

module.exports = function (grunt) {
  grunt.registerTask('startSelenium', 'Start an instance of selenium standalone', function () {
    const done = this.async();
    const config = _.defaults(this.options(), {
      seleniumStandalone: {
        filename: 'selenium-server-standalone-2.47.1.jar',
        server: 'https://selenium-release.storage.googleapis.com/2.47/',
        md5: 'e6cb10b8f0f353c6ca4a8f62fb5cb472'
      }
    });

    const SELENIUM_DIRECTORY = path.join(grunt.config.get('root'), 'selenium');
    const SELENIUM_FILE_PATH = path.join(SELENIUM_DIRECTORY, config.seleniumStandalone.filename);
    const SELENIUM_DOWNLOAD_URL = config.seleniumStandalone.server + config.seleniumStandalone.filename;
    const SELENIUM_HASH = config.seleniumStandalone.md5;

    function waitForReadiness(seleniumProcess, ready) {
      seleniumProcess.stderr.on('data', function (log) {
        if (~log.toString('utf8').indexOf('Selenium Server is up and running')) {
          grunt.log.writeln('Selenium standalone started on port 4444');
          done();
        }
      });

      process.on('exit', function () {
        seleniumProcess.kill();
      });
    }

    function validateDownload(path, expectedHash, success) {
      grunt.log.write('Validating hash...');
      fs.readFile(path, function (err, data) {
        if (err) grunt.fail.warn(err);
        const calculatedHash = crypto.createHash('md5').update(data).digest('hex');
        if (calculatedHash !== expectedHash) return grunt.fail.warn('Selenium download has an invalid hash');
        grunt.log.writeln('done');
        success();
      });
    }

    function spawnSelenium() {
      var seleniumProcess = spawn('java', ['-jar', SELENIUM_FILE_PATH]);
      waitForReadiness(seleniumProcess);
    }

    function downloadSelenium(success) {
      grunt.log.write(`Downloading ${SELENIUM_DOWNLOAD_URL}...`);
      request.get(SELENIUM_DOWNLOAD_URL)
      .pipe(fs.createWriteStream(SELENIUM_FILE_PATH))
      .on('finish', function () {
        grunt.log.writeln('done');
        validateDownload(SELENIUM_FILE_PATH, SELENIUM_HASH, success);
      })
      .on('error', function (err) {
        grunt.fail.warn(err);
      });
    }


    function start() {
      fs.mkdir(SELENIUM_DIRECTORY, function (err) {
        if (err && err.code !== 'EEXIST') grunt.fail.warn(err);
        fs.exists(SELENIUM_FILE_PATH, function (exists) {
          if (exists) {
            spawnSelenium();
          } else {
            downloadSelenium(spawnSelenium);
          }
        });
      });
    }

    start();

  });
};
