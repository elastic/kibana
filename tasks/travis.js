module.exports = function (grunt) {

  grunt.registerTask('travis', 'Travis CI build script', [
    'eslint:source',
    'test:server',
    'test:browser'
  ]);

};
