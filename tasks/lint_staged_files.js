import { resolve } from 'path';

const root = resolve(__dirname, '..');

export default function (grunt) {
  grunt.registerTask('lintStagedFiles', function () {
    grunt.task.requires('collectStagedFiles');

    // match these patterns
    var patterns = grunt.config.get('eslint.source.files.src');
    if (!patterns) grunt.fail.warn('eslint file pattern is not defined');

    const files = grunt.config
    .get('stagedFiles')
    .map(file => resolve(root, file))
    .filter(file => grunt.file.isMatch(patterns, file));

    grunt.config.set('eslint.staged.files.src', files);
    grunt.task.run(['eslint:staged']);
  });
}
