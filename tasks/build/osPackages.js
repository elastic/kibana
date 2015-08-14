module.exports = function (grunt) {
  let { resolve } = require('path');
  let { indexBy } = require('lodash');
  let { execFileSync } = require('child_process');

  let { config } = grunt;
  let targetDir = config.get('target');
  let version = config.get('pkg.version');
  let userScriptsDir = config.get('userScriptsDir');
  let servicesByName = indexBy(config.get('services'), 'id');

  grunt.registerTask('build-osPackages', function () {
    grunt.config.get('platforms').forEach(({ name, buildDir }) => {

      let arch = /x64$/.test(name) ? 'x86_64' : 'i686';
      let files = buildDir + '/=/opt/kibana';
      let fpm = args => execFileSync('fpm', args);

      let args = [
        '-f',
        '-p', targetDir,
        '-s', 'dir',
        '-n', 'kibana',
        '-v', version,
        '--after-install', resolve(userScriptsDir, 'installer.sh'),
        '--after-remove', resolve(userScriptsDir, 'remover.sh'),
        '--config-files', '/opt/kibana/config/kibana.yml'
      ];

      grunt.file.mkdir(targetDir);

      // TODO(sissel): Check if `fpm` is available
      if (/linux-x(86|64)$/.test(name)) {
        // kibana.rpm and kibana.deb
        let sysv = servicesByName.sysv;
        let sysvInit = sysv.outputDir + '/etc/=/etc/';
        fpm(args.concat('-t', 'rpm', '-a', arch, '--rpm-os', 'linux', files, sysvInit));
        fpm(args.concat('-t', 'deb', '-a', arch, files, sysvInit));
        return;
      }

      if (/darwin-x(86|64)$/.test(name)) {
        // kibana.pkg
        let launchd = servicesByName.launchd;
        let launchdInit = launchd.outputDir + '/=/';
        fpm(args.concat('-t', 'osxpkg', '-a', arch, files, launchdInit));
        return;
      }

    });
  });
};
