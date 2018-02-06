import { compact } from 'lodash';
import { delimiter } from 'path';

module.exports = function (grunt) {
  // TODO: remove after migration to new CI is complete
  grunt.registerTask('jenkins', compact([
    'jenkins:env',
    'rejectRejFiles',
    'test',
    process.env.JOB_NAME === 'kibana_core' ? 'build' : null
  ]));

  grunt.registerTask('jenkins:env', () => {
    // make sure JAVA_HOME points to JDK8
    const HOME = '/usr/lib/jvm/jdk8';
    process.env.JAVA_HOME = HOME;

    // extend PATH to point to JDK8
    const path = process.env.PATH.split(delimiter);
    path.unshift(`${HOME}/bin`);
    process.env.PATH = path.join(delimiter);
  });

  grunt.registerTask('jenkins:docs', [
    'docker:docs'
  ]);

  grunt.registerTask('jenkins:unit', [
    'jenkins:env',
    'rejectRejFiles',

    // We need to build all the Kibana packages so ESLint is able to verify that
    // e.g. imports resolve properly. If we don't build the packages here, the
    // `main` field in their `package.json` would link to a location that
    // doesn't exist yet.
    'buildPackages',

    'run:eslint',
    'licenses',
    'test:server',
    'test:jest',
    'test:browser-ci',
    'test:api',
    '_build:verifyTranslations',
  ]);

  grunt.config.set('functional_test_runner.functional.options.configOverrides.mochaOpts.bail', true);
  grunt.registerTask('jenkins:selenium', [
    'jenkins:env',
    'rejectRejFiles',

    'test:uiRelease'
  ]);

};
