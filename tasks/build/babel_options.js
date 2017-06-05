module.exports = function (grunt) {

  const srcFile = 'build/kibana/src/optimize/babel/options.js';
  const buildFile = 'build/kibana/src/optimize/babel/options.build.js';
  const rename = require('fs').renameSync;
  const unlink = require('fs').unlinkSync;

  grunt.registerTask('_build:babelOptions', function () {
    unlink(srcFile);
    rename(buildFile, srcFile);
    grunt.file.mkdir('build/kibana/optimize');
  });

};
