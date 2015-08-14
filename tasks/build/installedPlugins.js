module.exports = function (grunt) {
  grunt.registerTask('_build:installedPlugins', function () {
    grunt.file.mkdir('build/kibana/installedPlugins');
  });
};
