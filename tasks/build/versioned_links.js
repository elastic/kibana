import { basename, resolve } from 'path';
module.exports = function (grunt) {
  const exec = require('../utils/exec').silent;

  grunt.registerTask('_build:versionedLinks', function () {
    const rootPath = grunt.config.get('root');

    const buildFiles = grunt.file.expand('build/kibana/{*,.*}')
    .map(function (file) {
      return resolve(rootPath, file);
    });

    const transferFiles = (source, link) => exec('cp', ['-r', source, link]);

    grunt.config.get('platforms').forEach(function (platform) {
      grunt.file.mkdir(platform.buildDir);

      // link all files at the root of the build
      buildFiles.forEach(function (source) {
        transferFiles(source, resolve(platform.buildDir, basename(source)));
      });

      // link the node modules
      transferFiles(platform.nodeDir, resolve(platform.buildDir, 'node'));
    });
  });
};
