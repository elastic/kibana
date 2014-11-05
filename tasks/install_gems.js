var child_process = require('child_process');
var join = require('path').join;
module.exports = function (grunt) {
  grunt.registerTask('install_gems', 'Install Ruby Gems', function () {
    var done = this.async();
    var gemfile = join(grunt.config.get('root'), 'Gemfile');
    var jrubyPath = grunt.config.get('jrubyPath');
    var jruby = jrubyPath + '/bin/jruby -S';
    var command = jruby + ' gem install bundler && ' + jruby + ' bundle install --gemfile ' + gemfile;
    child_process.exec(command, function (err, stdout, stderr) {
      if (err) {
        grunt.log.error(stderr);
        return done(err);
      }
      grunt.log.writeln(stdout);
      return done();
    });
  });
};

