export default function (grunt) {
  grunt.registerTask('precommit', [
    'collectFilesToCommit',
    'collectStagedFiles',
    'checkAddedFilenames',
    'lintStagedFiles'
  ]);
};
