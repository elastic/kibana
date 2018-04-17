// Fails if any .rej files are found
// .rej files are an artifact from a failed git-apply or a jasper backport

// This check is intentionally performed on the files in the repo rather than
// on the files that are to be committed.

export default grunt => {
  grunt.registerTask('rejectRejFiles', 'Reject any git-apply .rej files', () => {
    const files = grunt.file.expand([
      '**/*.rej',
      '!.es/**/*.rej',
      '!plugins/**/*.rej',
      '!optimize/**/*.rej',
      '!**/node_modules/**/*.rej',
    ]);

    if (files.length > 0) {
      const err = `.rej files are not allowed:\n${files.join('\n')}`;
      grunt.log.error(err);
      return false;
    }
  });
};
