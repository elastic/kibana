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
        '/usr/share/kibana/bin/kibana',
        '-c /etc/kibana/kibana.yml'
      ]);
    });
<<<<<<< a9f1c863a78d71b9d350badac9d65a204898e566
=======

    grunt.file.mkdir(userScriptsDir);
    exec('please-manage-user', ['--output', userScriptsDir, 'kibana']);
    appendFileSync(resolve(userScriptsDir, 'installer.sh'), 'chown -R kibana:kibana /usr/share/kibana/optimize');
>>>>>>> [build] move install to /usr/share, config to /etc/kibana
  });
};
