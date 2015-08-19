module.exports = function (grunt) {
  let { compact } = require('lodash');

  grunt.registerTask('jenkins', 'Jenkins build script', compact([
    'esvm:dev',
    'test',
    process.env.JOB_NAME === 'kibana_core' ? 'build' : null
  ]));

};
