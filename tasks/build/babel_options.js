module.exports = function (grunt) {

  var srcFile = 'build/kibana/src/optimize/babel_options.js';
  var buildFile = 'build/kibana/src/optimize/babel_options.build.js';
  var rename = require('fs').renameSync;
  var unlink = require('fs').unlinkSync;

  grunt.registerTask('_build:babelOptions', function () {
    unlink(srcFile);
    rename(buildFile, srcFile);
    grunt.file.mkdir('build/kibana/optimize');
  });

};
