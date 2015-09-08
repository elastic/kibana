module.exports = function (grunt) {
  grunt.registerTask('build', [
    'get_build_props',
    'clean:target',
    'clean:build',
    'less:build',
    'copy:kibana_src',
    'clean:noDistPlugins',

    'webpack:build',
    'clean:unneeded_source_in_build',

    'copy:dist',
    'dist_readme',
    'dist_package_json',
    'chmod_kibana',
    'make_plugin_dir',
    'copy:plugin_readme',
    'clean:test_from_node_modules',
    'download_node_binaries',
    'copy:versioned_dist',
    'create_services',
    'create_packages',
    'create_shasums'
  ]);
};
