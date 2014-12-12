var path = require('path');
var workingPath = path.resolve(__dirname, '..');
var simplegit = require('simple-git')(workingPath);
module.exports = function (grunt) {
  grunt.registerTask('hintStagedFiles', 'JSHint staged filed', function () {
    grunt.log.debug('git working path', workingPath);

    var done = this.async();
    var files = simplegit.diff('--name-only --cached', function (err, files) {
      // match these patterns
      var patterns = grunt.config.get('jshint.source.files.src');
      files = files.split('\n').filter(Boolean).map(function (file) {
        return path.join(workingPath, file);
      });

      files = grunt.file.match(patterns, files);
      grunt.log.debug(files);

      grunt.config.set('jshint.staged.files.src', files);

      grunt.task.run(['jshint:staged']);
      done();
    });
  });
};

