module.exports = function (grunt) {
  grunt.registerTask('server', function () {
    grunt.task.run([
      'configureRewriteRules',
      'connect'
    ]);
  });
};