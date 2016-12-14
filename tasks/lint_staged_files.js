import { resolve } from 'path';
import { isStaged, getFilename } from './utils/files_to_commit';
import { CLIEngine } from 'eslint';
import minimatch from 'minimatch';

const root = resolve(__dirname, '..');

export default function (grunt) {
  grunt.registerTask('lintStagedFiles', function () {
    grunt.task.requires('collectFilesToCommit');

    // convert eslint paths to globs
    const cli = new CLIEngine();
    const eslintSourcePaths = grunt.config.get('eslint.options.paths');
    if (!eslintSourcePaths) grunt.fail.warn('eslint.options.paths is not defined');

    const sourcePathRegexps = cli.resolveFileGlobPatterns(eslintSourcePaths)
      .map(glob => minimatch.makeRe(glob));

    const files = grunt.config
    .get('filesToCommit')
    .filter(isStaged)
    .map(getFilename)
    .map(file => resolve(root, file))
    .filter(file => {
      if (!sourcePathRegexps.some(re => file.match(re))) {
        return false;
      }

      if (cli.isPathIgnored(file)) {
        return false;
      }

      return true;
    });

    grunt.config.set('eslint.staged.options.paths', files);
    grunt.task.run(['eslint:staged']);
  });
}
