import { resolve } from 'path';
import { indexBy } from 'lodash';
import exec from '../utils/exec';

export default (grunt) => {
  const targetDir = grunt.config.get('target');
  const packageScriptsDir = grunt.config.get('packageScriptsDir');
  const servicesByName = indexBy(grunt.config.get('services'), 'name');
  const config = grunt.config.get('packages');
  const fpm = args => exec('fpm', args);

  grunt.registerTask('_build:osPackages', function () {
    grunt.config.get('platforms')
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
        '--name', config.name,
        '--description', config.description,
        '--version', config.version,
        '--url', config.site,
        '--vendor', config.vendor,
        '--maintainer', config.maintainer,
        '--license', config.license,
        '--after-install', resolve(packageScriptsDir, 'post_install.sh'),
        '--before-install', resolve(packageScriptsDir, 'pre_install.sh'),
        '--before-remove', resolve(packageScriptsDir, 'pre_remove.sh'),
        '--after-remove', resolve(packageScriptsDir, 'post_remove.sh'),
        '--config-files', config.path.kibanaConfig,
        '--template-value', `user=${config.user}`,
        '--template-value', `group=${config.group}`,
        '--template-value', `optimizeDir=${config.path.home}/optimize`
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
        `${buildDir}/=${config.path.home}/`,
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
