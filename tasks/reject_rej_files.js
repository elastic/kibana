import { startsWith } from 'lodash';

// Fails if any .rej files are found
// .rej files are an artifact from a failed git-apply or a jasper backport

// This check is intentionally performed on the files in the repo rather than
// on the files that are to be committed.

export default grunt => {
  grunt.registerTask('rejectRejFiles', 'Reject any git-apply .rej files', () => {
    const ignoredTopLevelDirs = [
      'esvm',
      'plugins',
      'node_modules',
      'optimize'
    ];

    const matchBase = true;
    const filter = file => (
      ignoredTopLevelDirs.every(dir => !startsWith(file, dir))
    );

    const files = grunt.file.expand({ filter, matchBase }, '*.rej');
    if (files.length > 0) {
      const err = `.rej files are not allowed:\n${files.join('\n')}`;
      grunt.log.error(err);
      return false;
    }
  });
};
