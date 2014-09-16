module.exports = function (grunt) {
  if (grunt.option('shhh')) {
    process.env.RACK_ENV = 'staging';
    grunt.option('no-test-watcher', true);
  }

  grunt.registerTask('dev', [
    'less',
    'jade',
    'ruby_server',
    'maybe_start_server',
    'watch'
  ]);
};
