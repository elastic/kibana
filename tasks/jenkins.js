module.exports = function (grunt) {
  grunt.registerTask('jenkins:docs', [
    'docker:docs'
  ]);

  grunt.registerTask('jenkins:unit', [
    'run:eslint',
    'licenses',
    'run:verifyNotice',
    'test:server',
    'test:jest',
    'test:jest_integration',
    'test:projects',
    'test:browser-ci',
    'run:apiIntegrationTests',
    'verifyTranslations',
  ]);

  grunt.registerTask('jenkins:selenium', [
    'test:uiRelease'
  ]);
};
