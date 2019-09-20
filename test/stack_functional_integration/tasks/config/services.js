module.exports = function (grunt) {
  let { resolve } = require('path');
  let rootDir = grunt.config.get('root');

  return [
    ['launchd', '10.9'],
    ['upstart', '1.5'],
    ['systemd', 'default'],
    ['sysv', 'lsb-3.1']
  ]
  .map(function ([ name, version ]) {
    return { name, version, outputDir: resolve(rootDir, `build/services/${name}`) };
  });
};
