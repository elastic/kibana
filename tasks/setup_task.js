module.exports = function (grunt) {
  grunt.registerTask('setup', [
    'clean:setup',
    'shell:clone_kibana'
  ]);
};