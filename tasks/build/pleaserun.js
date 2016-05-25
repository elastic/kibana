module.exports = function createServices(grunt) {
  const { resolve } = require('path');
  const { appendFileSync } = require('fs');
  const exec = require('../utils/exec');

  const userScriptsDir = grunt.config.get('userScriptsDir');
  const { path, user, group } = grunt.config.get('packages');

  grunt.registerTask('_build:pleaseRun', function () {
    // TODO(sissel): Detect if 'pleaserun' is found, and provide a useful error
    // to the user if it is missing.

    grunt.config.get('services').forEach(function (service) {
      grunt.file.mkdir(service.outputDir);
      exec('pleaserun', [
        '--install',
        '--no-install-actions',
        '--install-prefix', service.outputDir,
        '--overwrite',
        '--user', user,
        '--group', group,
        '--sysv-log-path', path.logs,
        '-p', service.name,
        '-v', service.version,
        path.kibanaBin,
        `-c ${path.kibanaConfig}`
      ]);
    });
  });
};
