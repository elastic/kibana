module.exports = function (grunt) {
  let { flatten } = require('lodash');

  grunt.registerTask('build', flatten([
    '_build:getProps',
    'clean:build',
    'clean:target',
    '_build:downloadNodeBuilds:start',
    'copy:devSource',
    'babel:build',
    '_build:babelOptions',
    '_build:installedPlugins',
    '_build:packageJson',
    '_build:readme',
    '_build:installNpmDeps',
    '_build:removePkgJsonDeps',
    'clean:testsFromModules',
    'clean:deepModuleBins',
    'clean:deepModules',
    'run:optimizeBuild',
    'stop:optimizeBuild',
    '_build:downloadNodeBuilds:finish',
    '_build:versionedLinks',
    '_build:archives',
    !grunt.option('os-packages') ? [] : [
      '_build:pleaseRun',
      '_build:osPackages',
    ],
    '_build:shasums'
  ]));
};
