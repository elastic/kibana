module.exports = function (grunt) {
  let { config } = grunt;
  let { statSync } = require('fs');
  let { join } = require('path');
  let buildDir = join(config.get('root'), 'build', 'kibana');
  let exec = (...args) => require('../utils/exec')(...args, { cwd: buildDir });
  let newFiles = [];
  let shrinkwrapFile = join(buildDir, 'npm-shrinkwrap.json');

  grunt.registerTask('_build:shrinkwrap:ensureExists', function (createIfMissing) {
    try {
      statSync(shrinkwrapFile);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;

      if (createIfMissing) {
        exec('npm', ['shrinkwrap', '--dev', '--loglevel', 'error']);
        newFiles.push(shrinkwrapFile);
      }
      else grunt.fail.warn('Releases require an npm-shrinkwrap.json file to exist');
    }
  });
};
