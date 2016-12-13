module.exports = function (grunt) {

  let srcFile = 'build/kibana/src/optimize/babel_options.js';
  let buildFile = 'build/kibana/src/optimize/babel_options.build.js';
  let rename = require('fs').renameSync;
  let unlink = require('fs').unlinkSync;

  grunt.registerTask('_build:babelOptions', function () {
    unlink(srcFile);
    rename(buildFile, srcFile);
    grunt.file.mkdir('build/kibana/optimize');
  });

};
