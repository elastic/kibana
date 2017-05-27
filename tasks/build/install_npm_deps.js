module.exports = function (grunt) {
  const { exec } = require('child_process');
  const { resolve } = require('path');

  grunt.registerTask('_build:installNpmDeps', function () {
    grunt.file.mkdir('build/kibana/node_modules');

    exec('npm install  --production --no-optional', {
      cwd: grunt.config.process('<%= root %>/build/kibana')
    }, this.async());
  });
};


