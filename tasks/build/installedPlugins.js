module.exports = function (grunt) {
  grunt.registerTask('build-installedPlugins', function () {
    grunt.file.mkdir('build/kibana/installedPlugins');
  });
};
