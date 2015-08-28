module.exports = function (grunt) {
  let { resolve } = require('path');
  let { indexBy } = require('lodash');

  let { config } = grunt;
  let exec = require('../utils/exec');
  let targetDir = config.get('target');
  let version = config.get('pkg.version');
  let userScriptsDir = config.get('userScriptsDir');
  let servicesByName = indexBy(config.get('services'), 'name');

  grunt.registerTask('_build:osPackages', function () {
    grunt.config.get('platforms').forEach(({ name, buildDir }) => {
      // TODO(sissel): Check if `fpm` is available

      let arch = /x64$/.test(name) ? 'x86_64' : 'i686';
      let fpm = args => exec('fpm', args);

      let args = [
        '--force',
        '--package', targetDir,
        '-s', 'dir', // input type
        '--name', 'kibana',
        '--version', version,
        '--after-install', resolve(userScriptsDir, 'installer.sh'),
        '--after-remove', resolve(userScriptsDir, 'remover.sh'),
        '--config-files', '/opt/kibana/config/kibana.yml'
      ];

      let files = buildDir + '/=/opt/kibana';
      grunt.file.mkdir(targetDir);

      // kibana.rpm and kibana.deb
      if (/linux-x(86|64)$/.test(name)) {
        let sysv = servicesByName.sysv.outputDir + '/etc/=/etc/';
        fpm(args.concat('-t', 'rpm', '-a', arch, '--rpm-os', 'linux', files, sysv));
        fpm(args.concat('-t', 'deb', '-a', arch, files, sysv));
        return;
      }

      // kibana.pkg
      if (/darwin-x(86|64)$/.test(name)) {
        let launchd = servicesByName.launchd.outputDir + '/=/';
        fpm(args.concat('-t', 'osxpkg', '-a', arch, files, launchd));
        return;
      }

    });
  });
};
