import { resolve } from 'path';
import { indexBy } from 'lodash';
import exec from '../utils/exec';

export default (grunt) => {
  const { config } = grunt;
  const exec = require('../utils/exec');
  const targetDir = config.get('target');
  const packageScriptsDir = grunt.config.get('packageScriptsDir');
  const servicesByName = indexBy(config.get('services'), 'name');
  const packages = config.get('packages');
  const fpm = args => exec('fpm', args);

  grunt.registerTask('_build:osPackages', function () {
    grunt.file.mkdir('target');

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
        '--name', packages.name,
        '--description', packages.description,
        '--version', packages.version,
        '--url', packages.site,
        '--vendor', packages.vendor,
        '--maintainer', packages.maintainer,
        '--license', packages.license,
        '--after-install', resolve(packageScriptsDir, 'post_install.sh'),
        '--before-install', resolve(packageScriptsDir, 'pre_install.sh'),
        '--before-remove', resolve(packageScriptsDir, 'pre_remove.sh'),
        '--after-remove', resolve(packageScriptsDir, 'post_remove.sh'),
        '--config-files', packages.path.kibanaConfig,
        '--template-value', `user=${packages.user}`,
        '--template-value', `group=${packages.group}`,
        '--template-value', `optimizeDir=${packages.path.home}/optimize`,
        '--template-value', `configDir=${packages.path.conf}`,
        '--template-value', `pluginsDir=${packages.path.plugins}`,
        //config folder is moved to path.conf, exclude {path.home}/config
        //uses relative path to --prefix, strip the leading /
        '--exclude', `${packages.path.home.slice(1)}/config`
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
        `${buildDir}/=${packages.path.home}/`,
        `${buildDir}/config/=${packages.path.conf}/`,
        `${servicesByName.sysv.outputDir}/etc/=/etc/`,
        `${servicesByName.systemd.outputDir}/lib/=/lib/`
      ];

      //Manually find flags, multiple args without assignment are not entirely parsed
      const flags = grunt.option.flags().filter(flag => /deb|rpm/.test(flag)).join(',');
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
