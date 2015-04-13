module.exports = function (grunt) {
  var _ = require('lodash');

  grunt.registerTask('dev', function () {
    var tasks = [
      'less:dev',
      'jade',
      'esvm:dev',
      'maybe_start_kibana',
      'watch'
    ];

    if (!grunt.option('with-es')) {
      _.pull(tasks, 'esvm:dev');
    }

    grunt.task.run(tasks);
  });
};
