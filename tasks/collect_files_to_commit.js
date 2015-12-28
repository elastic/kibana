import filesToCommit from './utils/files_to_commit';
import { resolve } from 'path';

const root = resolve(__dirname, '..');

export default function registerCollectFilesToCommit(grunt) {
  grunt.registerTask('collectFilesToCommit', function () {
    filesToCommit(root)
    .then(files => {
      grunt.log.ok(`${files.length} files with changes to commit`);
      grunt.config.set('filesToCommit', files);
    })
    .nodeify(this.async());
  });
};
