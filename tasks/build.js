module.exports = function (grunt) {
  grunt.registerTask('build', [
    'clean:target',
    'clean:build',
    'require_css_deps:copy',
    'less',
    'requirejs',
    'clean:unneeded_source_in_build',
    'compress:build_zip',
    'compress:build_tarball'
  ]);
};