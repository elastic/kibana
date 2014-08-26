module.exports = function (grunt) {
  grunt.registerTask('build', [
    'clean:target',
    'clean:build',
    'require_css_deps:copy',
    'less',
    'copy:kibana_src',
    'touch_config',
    'requirejs',
    'clean:unneeded_source_in_build',
    'copy:server_src',
    'warble',
    'copy:dist',
    'chmod_kibana',
    'compress:build_zip',
    'compress:build_tarball'
  ]);
};
