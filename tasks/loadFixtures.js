var _ = require('lodash');
var request = require('request');
var fs = require('fs');
var path = require('path');
var colors = require('ansicolors');

module.exports = function (grunt) {
  grunt.registerTask('loadFixtures', 'Loads fixtures into elasticsearch', function () {
    const FIXTURES_PATH = path.join(grunt.config.get('root'), 'test/fixtures');

    const config = this.options();
    const done = this.async();

    fs.readdir(FIXTURES_PATH, function (err, files) {
      if (err) grunt.fail.warn(err);

      let doneProcessing = 0;
      files.forEach(function (file) {
        fs.createReadStream(path.join(FIXTURES_PATH, file))
        .pipe(request.post(`${config.server}/_bulk`, function (err, res, body) {
          if (err || res.statusCode !== 200) grunt.fail.warn(err || body);
          grunt.log.writeln(`[${colors.green('success')}] ${file}`);
          if (++doneProcessing === files.length) done();
        }));
      });
    });
  });
};
