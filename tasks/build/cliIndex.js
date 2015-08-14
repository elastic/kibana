module.exports = function (grunt) {

  var srcFile = 'build/kibana/src/cli/index.js';
  var buildFile = 'build/kibana/src/cli/index.build.js';
  var rename = require('fs').renameSync;
  var unlink = require('fs').unlinkSync;

  grunt.registerTask('_build:cliIndex', function () {
    unlink(srcFile);
    rename(buildFile, srcFile);
  });

};
