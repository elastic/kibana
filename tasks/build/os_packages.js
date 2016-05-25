module.exports = function (grunt) {
  const { resolve } = require('path');
  const { indexBy } = require('lodash');
  const { config } = grunt;
  const exec = require('../utils/exec');

  const targetDir = config.get('target');
  const packageScriptsDir = config.get('packageScriptsDir');
  const servicesByName = indexBy(config.get('services'), 'name');
  const packageConfig = config.get('packages');

  grunt.registerTask('_build:osPackages', function () {
    config.get('platforms').forEach(({ name, buildDir }) => {
      // TODO(sissel): Check if `fpm` is available
      if (!(/linux-x(86|64)$/.test(name))) return;

      const arch = /x64$/.test(name) ? 'x86_64' : 'i386';
      const fpm = args => exec('fpm', args);

      const args = [
        '--force',
        '--package', targetDir,
        '-s', 'dir', // input type
        '--name', packageConfig.name,
        '--description', packageConfig.description,
        '--version', packageConfig.version,
        '--url', packageConfig.site,
        '--vendor', packageConfig.vendor,
        '--maintainer', packageConfig.maintainer,
        '--license', packageConfig.license,
        '--after-install', resolve(packageScriptsDir, 'post_install.sh'),
        '--before-install', resolve(packageScriptsDir, 'pre_install.sh'),
        '--before-remove', resolve(packageScriptsDir, 'pre_remove.sh'),
        '--after-remove', resolve(packageScriptsDir, 'post_remove.sh'),
        '--config-files', packageConfig.path.kibanaConfig,
        '--template-value', 'user=kibana',
        '--template-value', 'group=kibana'

        //config folder is moved to path.conf, exclude {path.home}/config
        //uses relative path to --prefix, strip the leading /
        '--exclude', `${packageConfig.path.home.slice(1)}/config`
      ];

      const files = [
        `${buildDir}/=${packageConfig.path.home}/`,
        `${buildDir}/config/=${packageConfig.path.conf}/`,
        `${servicesByName.sysv.outputDir}/etc/=/etc/`,
        `${servicesByName.systemd.outputDir}/lib/=/lib/`
      ];

      //Manually find flags, multiple args without assignment are not entirely parsed
      var flags = grunt.option.flags().join(',');

      const buildDeb = !!flags.match('deb');
      const buildRpm = !!flags.match('rpm');
      const noneSpecified = !buildRpm && !buildDeb;

      grunt.file.mkdir(targetDir);
      if (buildDeb || noneSpecified) {
        fpm(args.concat('-t', 'deb', '--deb-priority', 'optional', '-a', arch, files));
      }
      if (buildRpm || noneSpecified) {
        fpm(args.concat('-t', 'rpm', '-a', arch, '--rpm-os', 'linux', files));
      }

    });
  });
};
