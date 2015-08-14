var { resolve } = require('path');
var { execFileSync } = require('child_process');

module.exports = function createServices(grunt) {
  grunt.registerTask('build-pleaserun', function () {
    // TODO(sissel): Detect if 'pleaserun' is found, and provide a useful error
    // to the user if it is missing.

    grunt.config.get('services').forEach(function (service) {
      grunt.file.mkdir(service.outDir);
      execFileSync('pleaserun', [
        '--install',
        '--no-install-actions',
        '--install-prefix', service.outDir,
        '--overwrite',
        '--user', 'kibana',
        '--sysv-log-path', '/var/log/kibana/',
        '-p', service.name,
        '-v', service.version,
        '/opt/kibana/bin/kibana'
      ]);
    });

  });
};
