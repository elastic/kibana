import { exec } from 'child_process';
module.exports = function (grunt) {
  grunt.registerTask('_build:installDependencies', function () {
    grunt.file.mkdir('<%= root %>/build/kibana/node_modules');

    const yarn = `${__dirname}/../vendor/yarn-1.3.2.js`;

    exec(`${yarn} --production --ignore-optional`, {
      cwd: grunt.config.process('<%= root %>/build/kibana')
    }, this.async());
  });
};
