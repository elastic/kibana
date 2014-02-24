module.exports = function (grunt) {
  grunt.registerTask('dev', ['less', 'jade', 'connect:dev', 'watch']);
};