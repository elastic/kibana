import { extname, resolve, relative } from 'path';
import { isStaged, getFilename } from './utils/files_to_commit';
import { CLIEngine } from 'eslint';
import { red, blue } from 'ansicolors';
import minimatch from 'minimatch';

import { DEFAULT_ESLINT_PATHS } from '../src/dev/default_eslint_paths';

const root = resolve(__dirname, '..');

export default function (grunt) {
  grunt.registerTask('lintStagedFiles', function () {
    grunt.task.requires('collectFilesToCommit');

    // convert eslint paths to globs
    const cli = new CLIEngine();
    const sourcePathGlobs = cli.resolveFileGlobPatterns(DEFAULT_ESLINT_PATHS);

    const files = grunt.config
    .get('filesToCommit')
    .filter(isStaged)
    .map(getFilename)
    .map(file => relative(root, resolve(file))) // resolve to pwd, then get relative from the root
    .filter(file => {
      if (!sourcePathGlobs.some(glob => minimatch(file, glob))) {
        if (extname(file) === '.js') {
          grunt.log.writeln(`${red('WARNING:')} ${file} not selected by src/eslint/default_eslint_paths`);
        }
        return false;
      }

      if (cli.isPathIgnored(file)) {
        if (extname(file) === '.js') {
          grunt.log.writeln(`${blue('DEBUG:')} ${file} ignored by .eslintignore`);
        }
        return false;
      }

      return true;
    });

    if (files.length) {
      const args = grunt.config.get('run.eslintStaged.args');
      grunt.config.set('run.eslintStaged.args', [
        ...args,
        ...files
      ]);

      grunt.task.run(['run:eslintStaged']);
    }
  });
}
