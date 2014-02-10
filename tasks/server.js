module.exports = function (grunt) {
  grunt.registerTask('server', ['connect:dev:keepalive']);
  grunt.registerTask('test_server', ['connect:test:keepalive']);
};