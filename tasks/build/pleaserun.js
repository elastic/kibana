module.exports = function createServices(grunt) {
  const { resolve } = require('path');
  const { appendFileSync } = require('fs');
  const exec = require('../utils/exec');

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
        '--user', 'kibana',
        '--group', 'kibana',
        '--sysv-log-path', '/var/log/kibana/',
        '-p', service.name,
        '-v', service.version,
        '/opt/kibana/bin/kibana'
      ]);
    });
  });
};
