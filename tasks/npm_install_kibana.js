module.exports = function (grunt) {
  var childProcess = require('child_process');
  var { join } = require('path');

  grunt.registerTask('npm_install_kibana', 'NPM install kibana server into dist', function () {
    var done = this.async();
    var cwd = join(grunt.config.get('build'), 'dist', 'kibana', 'src');
    var command = 'npm install  --production --no-optional';
    var options = { cwd: cwd };
    childProcess.exec(command, options, function (err, stdout, stderr) {
      if (err) {
        grunt.log.error(stderr);
        return done(err);
      }
      grunt.log.writeln(stdout);
      return done();
    });
  });
};


