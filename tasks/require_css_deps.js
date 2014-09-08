module.exports = function (grunt) {
  var join = require('path').join;

  grunt.registerTask('require_css_deps:copy', function () {
    [
      'css-builder.js',
      'normalize.js'
    ].forEach(function (dep) {
      grunt.file.copy(
        join(grunt.config.get('bowerComponentsDir'), 'require-css',  dep),
        join(grunt.config.get('build'), 'src',  dep)
      );
    });
  });
};
