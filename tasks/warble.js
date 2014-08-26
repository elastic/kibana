var child_process = require('child_process');
var join = require('path').join;
module.exports = function (grunt) {
  grunt.registerTask('warble', 'Creates an executable jar.', function () {
    var done = this.async();
    var command = 'jruby -S warble';
    var options = {
      cwd: join(grunt.config.get('build'), 'kibana')
    };
    child_process.exec(command, options, function (err, stdout, stderr) {
      if (err) {
        grunt.log.error(stderr);
        return done(err);
      }

      grunt.log.writeln(stdout);
      return done();



    });
  });
};
