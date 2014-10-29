module.exports = function (grunt) {
  var _ = require('lodash');

  grunt.registerTask('dev', function () {
    var tasks = [
      'less',
      'jade',
      'esvm:dev',
      'ruby_server',
      'maybe_start_server',
      'watch'
    ];

    if (!grunt.option('with-es')) {
      _.pull(tasks, 'esvm:dev');
    }

    grunt.task.run(tasks);
  });
};
