module.exports = function (grunt) {
  var exec = require('child_process').execSync;
  grunt.registerTask('_build:getProps', function () {
    grunt.config.set('buildSha', String(exec('git rev-parse HEAD')).trim());
    grunt.config.set('buildNum', parseFloat(String(exec('git log --format="%h" | wc -l')).trim()));
  });
};
