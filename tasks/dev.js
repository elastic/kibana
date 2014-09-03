module.exports = function (grunt) {
  var useMRI = grunt.option('use-mri');
  var tasks = [
    'less',
    'jade'
  ];
  if (useMRI) {
    tasks = tasks.concat(['run:mri_server']);
  } else {
    tasks = tasks.concat([
      'download_jruby',
      'install_gems',
      'run:jruby_server',
      'wait_for_jruby'
    ]);
  }
  grunt.registerTask('dev', tasks.concat([
    'maybe_start_server',
    'watch'
  ]));
};
