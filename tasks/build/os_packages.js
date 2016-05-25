module.exports = function (grunt) {
  const { resolve } = require('path');
  const { indexBy } = require('lodash');
  const { config } = grunt;
  const exec = require('../utils/exec');

  const targetDir = config.get('target');
  const packageScriptsDir = config.get('packageScriptsDir');
  const servicesByName = indexBy(config.get('services'), 'name');
  const packageConfig = config.get('packages');
  const fpm = args => exec('fpm', args);

  grunt.registerTask('_build:osPackages', function () {
    config.get('platforms')
    .filter(({ name }) => /linux-x(86|64)$/.test(name))
    .map(({ name, buildDir }) => {
      const architecture = /x64$/.test(name) ? 'x86_64' : 'i386';
      return {
        buildDir,
        architecture
      };
    })
    .forEach(({ buildDir, architecture }) => {
      const baseOptions = [
        '--force',
        '--package', targetDir,
        '-s', 'dir', // input type
        '--architecture', architecture,
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
      const debOptions = [
        '-t', 'deb',
        '--deb-priority', 'optional'
      ];
      const rpmOptions = [
        '-t', 'rpm',
        '--rpm-os', 'linux'
      ];
      const args = [
        `${buildDir}/=${packageConfig.path.home}/`,
        `${buildDir}/config/=${packageConfig.path.conf}/`,
        `${servicesByName.sysv.outputDir}/etc/=/etc/`,
        `${servicesByName.systemd.outputDir}/lib/=/lib/`
      ];

      //Manually find flags, multiple args without assignment are not entirely parsed
      const flags = grunt.option.flags().join(',');
      const buildDeb = flags.includes('deb') || !flags.length;
      const buildRpm = flags.includes('rpm') || !flags.length;
      if (buildDeb) {
        fpm([...baseOptions, ...debOptions, ...args]);
      }
      if (buildRpm) {
        fpm([...baseOptions, ...rpmOptions, ...args]);
      }

    });
  });
};
