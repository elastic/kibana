module.exports = function (grunt) {
  grunt.registerTask('server', function () {
    grunt.task.run([
      'replace:dev_marvel_config',
      'configureRewriteRules',
      'connect'
    ]);
  });
};