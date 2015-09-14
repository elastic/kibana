var _ = require('lodash');
var wreck = require('wreck');
var fs = require('fs');
var path = require('path');
var colors = require('ansicolors');

module.exports = function (grunt) {
  grunt.registerTask('loadFixtures', 'Loads fixtures into elasticsearch', function () {
    const config = this.options();
    const done = this.async();

    fs.readdir(config.dataDir, function (err, files) {
      if (err) grunt.fail.warn(err);

      let doneProcessing = 0;
      files.forEach(function (file) {
        wreck.post(`${config.server}/_bulk`, {
          payload: fs.createReadStream(path.join(config.dataDir, file)),
          json: true
        }, function (err, res, payload) {
          var status;
          if (err || res.statusCode !== 200) {
            grunt.fail.warn(err || payload);
            status = colors.red('error');
          } else {
            status = colors.green('success');
          }
          grunt.log.writeln(`[${status}] ${file}`);
          if (++doneProcessing === files.length) done();
        });
      });
    });
  });
};
