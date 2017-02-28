module.exports = function (grunt) {
  grunt.registerTask('_build:extractAngularTranslations', function () {
    grunt.task.run('i18nextract');
  });
};
