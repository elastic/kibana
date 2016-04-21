module.exports = function (grunt) {
  grunt.registerTask('precommit', [
    'collectFilesToCommit',
    'checkAddedFilenames',
    'lintStagedFiles'
  ]);
}
