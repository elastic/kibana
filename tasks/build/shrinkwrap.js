module.exports = function (grunt) {
  let { config } = grunt;
  let { statSync } = require('fs');
  let { join } = require('path');
  let exec = (...args) => require('../utils/exec')(...args, { cwd: config.get('root') });
  let newFiles = [];
  let shrinkwrapFile = join(config.get('root'), 'npm-shrinkwrap.json');

  grunt.registerTask('_build:shrinkwrap:ensureExists', function (createIfMissing) {
    try {
      statSync(shrinkwrapFile);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;

      if (createIfMissing) {
        exec('npm', ['shrinkwrap', '--dev', '--logLevel', 'error']);
        newFiles.push(shrinkwrapFile);
      }
      else grunt.fail.warn('Releases require an npm-shrinkwrap.json file to exist');
    }
  });

  grunt.registerTask('_build:shrinkwrap:copyToBuild', function () {
    // this.requires(['_build:shrinkwrap:ensureExists', 'copy:devSource']);

    // backup shrinkwrap and copy to build
    exec('cp', ['npm-shrinkwrap.json', 'npm-shrinkwrap.dev']);
    exec('cp', ['npm-shrinkwrap.json', join(config.get('root'), 'build', 'kibana', 'npm-shrinkwrap.build.json')]);

    // create shrinkwrap without dev dependencies and copy to build
    exec('npm', ['shrinkwrap', '--logLevel', 'error']);
    exec('cp', ['npm-shrinkwrap.json', join(config.get('root'), 'build', 'kibana', 'npm-shrinkwrap.json')]);

    // restore the dev shrinkwrap
    exec('mv', ['npm-shrinkwrap.dev', 'npm-shrinkwrap.json']);
  });

  grunt.registerTask('_build:shrinkwrap:cleanup', function () {
    if (newFiles.length) exec('rm', newFiles.splice(0));
  });
};
