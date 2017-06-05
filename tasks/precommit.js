export default function (grunt) {
  grunt.registerTask('precommit', [
    'collectFilesToCommit',
    'checkAddedFilenames',
    'lintStagedFiles'
  ]);
}
