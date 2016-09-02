export default function (grunt) {
  grunt.registerTask('_build:data', function () {
    grunt.file.mkdir('build/kibana/data');
  });
}
