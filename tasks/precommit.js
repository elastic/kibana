export default function (grunt) {
  grunt.registerTask('precommit', [
    'collectStagedFiles',
    'checkStagedFilenames',
    'lintStagedFiles'
  ]);
};
