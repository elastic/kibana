var zlib = require('zlib');
var tar = require('tar');
var request = require('request');
var mkdirp = require('mkdirp');
var ProgressBar = require('progress');
var fs = require('fs');

module.exports = function (grunt) {
  grunt.registerTask('download_jruby', 'Downloads and installs jruby', function () {
    var done = this.async();
    var jrubyPath = grunt.config.get('jrubyPath');
    var jrubyVersion = grunt.config.get('jrubyVersion');
    var url = 'http://jruby.org.s3.amazonaws.com/downloads/' + jrubyVersion + '/jruby-bin-' + jrubyVersion + '.tar.gz';

    fs.stat(jrubyPath, function (err, stat) {
      if (err) {
        mkdirp(jrubyPath, function (err) {
          if (err) return done(err);
          var unzip = zlib.createGunzip();
          var out = tar.Extract({ path: jrubyPath, strip: 1 });
          out.on('close', done).on('error', done);
          var req = request.get(url);
          var bar;
          if (!process.env.JENKINS_HOME) {
            req.on('response', function (resp) {
              var total = parseInt(resp.headers['content-length'], 10);
              bar = new ProgressBar('[:bar] :percent :etas', {
                complete: '=',
                incomplete: ' ',
                width: 80,
                clear: true,
                total: total
              });
            });
            req.on('data', function (buffer) {
              bar.tick(buffer.length);
            });
          }
          req.pipe(unzip).pipe(out);
        });
      } else {
        done();
      }
    });
  });
};
