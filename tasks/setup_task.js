module.exports = function(grunt) {
  grunt.registerTask('setup', [
    'clean:setup',
    'gitclone:kibana',
    'copy:marvel_config'
  ]);
};