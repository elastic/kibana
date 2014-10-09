module.exports = function (grunt) {
  grunt.registerTask('build', [
    'get_build_props',
    'clean:target',
    'clean:build',
    'require_css_deps:copy',
    'less',
    'copy:kibana_src',
    'touch_config',
    'replace:build_props',
    'requirejs',
    'clean:unneeded_source_in_build',
    'copy:server_src',
    'download_jruby',
    'install_gems',
    'warble',
    'replace:dist',
    'copy:dist',
    'compile_dist_readme',
    'chmod_kibana',
    'copy:versioned_dist',
    'create_packages'
  ]);
};
