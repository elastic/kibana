import { resolve } from 'path';
import { appendFileSync } from 'fs';
import exec from '../utils/exec';
import { capitalize } from 'lodash';

export default (grunt) => {
  const userScriptsDir = grunt.config.get('userScriptsDir');
  const { path, user, group, name } = grunt.config.get('packages');

  grunt.registerTask('_build:pleaseRun', function () {
    grunt.config.get('services').forEach((service) => {
      grunt.file.mkdir(service.outputDir);
      exec('pleaserun', [
        '--install',
        '--no-install-actions',
        '--install-prefix', service.outputDir,
        '--overwrite',
        '--name', name,
        '--description', capitalize(name),
        '--user', user,
        '--group', group,
        '--log-file-stdout', `${path.logs}/`,
        '-p', service.name,
        '-v', service.version,
        path.kibanaBin
      ]);
    });
  });
};
