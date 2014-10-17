module.exports = function (grunt) {
  grunt.registerTask('make_plugin_dir', function () {
    grunt.file.mkdir(grunt.config.get('build') + '/dist/kibana/plugins');
  });
};