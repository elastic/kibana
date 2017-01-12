import { extname, resolve, relative } from 'path';
import { isStaged, getFilename } from './utils/files_to_commit';
import { CLIEngine } from 'eslint';
import { red, blue } from 'ansicolors';
import minimatch from 'minimatch';

const root = resolve(__dirname, '..');

export default function (grunt) {
  grunt.registerTask('lintStagedFiles', function () {
    grunt.task.requires('collectFilesToCommit');

    // convert eslint paths to globs
    const cli = new CLIEngine();
    const eslintSourcePaths = grunt.config.get('eslint.options.paths');
    if (!eslintSourcePaths) grunt.fail.warn('eslint.options.paths is not defined');

    const sourcePathGlobs = cli.resolveFileGlobPatterns(eslintSourcePaths);

    const files = grunt.config
    .get('filesToCommit')
    .filter(isStaged)
    .map(getFilename)
    .map(file => relative(root, resolve(file))) // resolve to pwd, then get relative from the root
    .filter(file => {
      if (!sourcePathGlobs.some(glob => minimatch(file, glob))) {
        if (extname(file) === '.js') {
          grunt.log.writeln(`${red('WARNING:')} ${file} not selected by grunt eslint config`);
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

    grunt.config.set('eslint.staged.options.paths', files);
    grunt.task.run(['eslint:staged']);
  });
}
