module.exports = function (grunt) {
  grunt.registerTask('jenkins:docs', [
    'docker:docs'
  ]);

  grunt.registerTask('jenkins:unit', [
    'run:eslint',
    'run:tslint',
    'run:checkFileCasing',
    'licenses',
    'verifyDependencyVersions',
    'run:verifyNotice',
    'test:server',
    'test:jest',
    'test:jest_integration',
    'test:projects',
    'test:browser-ci',
    'test:api',
    'verifyTranslations',
  ]);

  grunt.config.set('functional_test_runner.functional.options.configOverrides.mochaOpts.bail', true);
  grunt.registerTask('jenkins:selenium', [
    'test:uiRelease'
  ]);
};
