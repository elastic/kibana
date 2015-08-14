module.exports = function (grunt) {

  grunt.registerTask('jenkins', 'Jenkins build script', [
    'esvm:dev',
    'test'
  ]);

};
