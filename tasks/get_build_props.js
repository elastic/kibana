module.exports = function (grunt) {
  var exec = require('child_process').execSync;
  grunt.registerTask('get_build_props', function () {
    grunt.config.set('commitSha', String(exec('git rev-parse HEAD')).trim());
    grunt.config.set('buildNum', parseFloat(exec('git log --format="%h" | wc -l')).trim());
  });
};
