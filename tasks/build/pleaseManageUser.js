module.exports = function (grunt) {
  let { execFileSync } = require('child_process');
  let { resolve } = require('path');
  let userScriptsDir = grunt.config.get('userScriptsDir');

  grunt.registerTask('build:pleaseManageUser', function () {
    grunt.file.mkdir(userScriptsDir);
    execFileSync('please-manage-user', ['--output', userScriptsDir, 'kibana']);
  });
};
