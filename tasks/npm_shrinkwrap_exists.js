var child_process = require('child_process');
var join = require('path').join;
var statSync = require('fs').statSync;

module.exports = function (grunt) {
  var srcPath = join(grunt.config.get('build'), 'dist', 'kibana', 'src');

  grunt.registerTask('npm_install_kibana', 'NPM install kibana server into dist', function () {
    var done = this.async();
    var command = 'npm install  --production --no-optional';
    var options = { cwd: srcPath };
    child_process.exec(command, options, function (err, stdout, stderr) {
      if (err) {
        grunt.log.error(stderr);
        return done(err);
      }
      grunt.log.writeln(stdout);
      return done();
    });
  });

  grunt.registerTask('npm_shrinkwrap_exists', 'Ensure npm shrinkwrap file exists', function () {
    try {
      statSync(join(srcPath, 'npm-shrinkwrap.json'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      grunt.fail.warn('Releases require an npm-shrinkwrap.json file to exist');
    }
  });
};


