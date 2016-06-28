module.exports = function (grunt) {
  grunt.registerTask('_build:plugins', function () {
    grunt.file.mkdir('build/kibana/plugins');
  });
};
