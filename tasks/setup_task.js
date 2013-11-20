module.exports = function (grunt) {
  grunt.registerTask('setup', [
    'clean:setup',
    'gitclone:kibana'
  ]);
};