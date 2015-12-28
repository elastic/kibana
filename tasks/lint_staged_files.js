import { resolve } from 'path';
import { isStaged, getFilename } from './utils/files_to_commit';

const root = resolve(__dirname, '..');

export default function (grunt) {
  grunt.registerTask('lintStagedFiles', function () {
    grunt.task.requires('collectFilesToCommit');

    // match these patterns
    var patterns = grunt.config.get('eslint.source.files.src');
    if (!patterns) grunt.fail.warn('eslint file pattern is not defined');

    const files = grunt.config
    .get('filesToCommit')
    .filter(isStaged)
    .map(getFilename)
    .map(file => resolve(root, file))
    .filter(file => grunt.file.isMatch(patterns, file));

    grunt.config.set('eslint.staged.files.src', files);
    grunt.task.run(['eslint:staged']);
  });
}
