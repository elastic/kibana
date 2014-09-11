var _ = require('lodash');
module.exports = function (grunt) {
  /* jshint scripturl:true */
  var rubyTasks;
  if (grunt.option('use-mri')) {
    rubyTasks = [
      'run:mri_server',
    ];
  } else {
    rubyTasks = [
      'download_jruby',
      'install_gems',
      'run:jruby_server',
      'wait_for_jruby'
    ];
  }
  grunt.registerTask('test', rubyTasks.concat([
    'maybe_start_server',
    'jade',
    'mocha:unit',
    'jshint'
  ]));

  grunt.registerTask('coverage', rubyTasks.concat([
    'blanket',
    'maybe_start_server',
    'mocha:coverage'
  ]));

  grunt.registerTask('test:watch', rubyTasks.concat([
    'maybe_start_server',
    'watch:test'
  ]));
};
