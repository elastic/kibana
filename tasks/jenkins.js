module.exports = function (grunt) {
  let { compact } = require('lodash');

  grunt.registerTask('jenkins', 'Jenkins build script', function () {
    grunt.option('os-packages', true);
    grunt.task.run(compact([
      'test',
      process.env.JOB_NAME === 'kibana_core' ? 'build' : null
    ]));
  });

};
