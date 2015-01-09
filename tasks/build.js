module.exports = function (grunt) {
  grunt.registerTask('build', [
    'get_build_props',
    'clean:target',
    'clean:build',
    'require_css_deps:copy',
    'less',
    'copy:kibana_src',
    'clean:dev_only_plugins',
    'touch_config',
    'replace:build_props',
    'requirejs',
    'clean:unneeded_source_in_build',
    'copy:server_src',
    'replace:dist',
    'copy:dist',
    'compile_dist_readme',
    'chmod_kibana',
    'make_plugin_dir',
    'copy:plugin_readme',
    'describe_bundled_plugins',
    'npm_install_kibana',
    'download_node_binaries',
    'copy:versioned_dist',
    'create_packages'
  ]);
};
