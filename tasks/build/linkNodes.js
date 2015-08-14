module.exports = function (grunt) {
  let { execFileSync } = require('child_process');
  let { basename, resolve } = require('path');
  let { forOwn } = require('lodash');

  grunt.registerTask('build:versionedLinks', function () {
    let buildFiles = grunt.file.expand('build/kibana/{*,.*}');
    let rootDir = grunt.config.get('root');

    let buildMap = buildFiles.reduce(function (map, file) {
      map[file] = basename(file);
      return map;
    }, {});

    let ln = (source, link) => {
      execFileSync('ln', [
        '-s',
        resolve(rootDir, source),
        resolve(rootDir, link)
      ]);
    };

    grunt.config.get('platforms').forEach(function (platform) {
      grunt.file.mkdir(platform.buildDir);
      forOwn(buildMap, function (link, source) {
        ln(source, resolve(platform.buildDir, link));
      });
      ln(platform.nodeDir, resolve(platform.buildDir, 'node'));
    });
  });
};
