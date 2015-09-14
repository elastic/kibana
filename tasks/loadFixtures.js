var _ = require('lodash');
var request = require('request');
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
        fs.createReadStream(path.join(config.dataDir, file))
        .pipe(request.post(`${config.server}/_bulk`, function (err, res, body) {
          var status;
          if (err || res.statusCode !== 200) {
            grunt.fail.warn(err || body);
            status = colors.red('error');
          } else {
            status = colors.green('success');
          }
          grunt.log.writeln(`[${status}] ${file}`);
          if (++doneProcessing === files.length) done();
        }));
      });
    });
  });
};
