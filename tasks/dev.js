module.exports = function (grunt) {
  var useJRuby = grunt.option('use-jruby');
  var tasks = [
    'less',
    'jade'
  ];
  if (useJRuby) {
    tasks = tasks.concat([
      'download_jruby',
      'install_gems',
      'run:jruby_server',
      'wait_for_jruby'
    ]);
  } else {
    tasks = tasks.concat(['run:mri_server']);
  }
  grunt.registerTask('dev', tasks.concat([
    'maybe_start_server',
    'watch'
  ]));
};
