import { compact } from 'lodash';
import { delimiter } from 'path';

module.exports = function (grunt) {
  grunt.registerTask('jenkins', 'Jenkins build script', function () {
    // make sure JAVA_HOME points to JDK8
    const HOME = '/usr/lib/jvm/jdk8';
    process.env.JAVA_HOME = HOME;

    // extend PATH to point to JDK8
    const path = process.env.PATH.split(delimiter);
    path.unshift(`${HOME}/bin`);
    process.env.PATH = path.join(delimiter);

    // always build os packages on jenkins
    grunt.option('os-packages', true);

    grunt.task.run(compact([
      'rejectRejFiles',
      'test',
      process.env.JOB_NAME === 'kibana_core' ? 'build' : null
    ]));
  });

};
