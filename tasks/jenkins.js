import { compact } from 'lodash';
import { delimiter } from 'path';

module.exports = function (grunt) {
  grunt.registerTask('jeknins:env', () => {
    // make sure JAVA_HOME points to JDK8
    const HOME = '/usr/lib/jvm/jdk8';
    process.env.JAVA_HOME = HOME;

    // extend PATH to point to JDK8
    const path = process.env.PATH.split(delimiter);
    path.unshift(`${HOME}/bin`);
    process.env.PATH = path.join(delimiter);
  });

  grunt.registerTask('jenkins:unit', [
    'jenkins:env',
    'rejectRejFiles',

    'lint:source',
    'test:server',
    'test:browser',
    'test:api',
  ]);

  grunt.registerTask('jenkins:selenium', [
    'jenkins:env',
    'rejectRejFiles',

    'test:ui'
  ]);

};
