module.exports = function (grunt) {
  let { basename, resolve } = require('path');
  let { forOwn } = require('lodash');

  let exec = require('../utils/exec').silent;

  grunt.registerTask('_build:versionedLinks', function () {
    let rootPath = grunt.config.get('root');

    let buildFiles = grunt.file.expand('build/kibana/{*,.*}')
    .map(function (file) {
      return resolve(rootPath, file);
    });

    //We don't want to build os packages with symlinks
    let transferFiles = (source, link) => grunt.option('os-packages')
      ? exec('cp', ['-r', source, link])
      : exec('ln', ['-s', source, link]);

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
