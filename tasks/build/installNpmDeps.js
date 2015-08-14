module.exports = function (grunt) {
  var { execSync } = require('child_process');
  var { resolve } = require('path');

  grunt.registerTask('build:installNpmDeps', function () {
    grunt.file.mkdir('build/kibana/node_modules');

    execSync('npm install  --production --no-optional', {
      cwd: grunt.config.process('<%= root %>/build/kibana')
    });

    grunt.log.ok('done');
  });
};


