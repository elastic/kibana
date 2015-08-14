module.exports = function (grunt) {
  [
    ['launchd', '10.9'],
    ['upstart', '1.5'],
    ['systemd', 'default'],
    ['sysv', 'lsb-3.1']
  ]
  .map(function ([ name, version ]) {
    return {
      name,
      version,
      outputDir: `build/services/${name}` };
  });
};
