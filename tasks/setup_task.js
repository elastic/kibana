module.exports = function(grunt) {
  grunt.registerTask('setup', [
    'clean:setup',
    'gitclone:kibana',
    'clean:default_dashboard',
    'replace:dev_marvel_config',
    'symlink'
  ]);
};