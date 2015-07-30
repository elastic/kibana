module.exports = function (grunt) {

  grunt.registerTask('travis', 'Travis CI build script', [
    'esvm:dev',
    'test'
  ]);

};
