module.exports = function (grunt) {
  let { flatten } = require('lodash');

  grunt.registerTask('build', flatten([
    '_build:getProps',
    'clean:build',
    'clean:target',
    '_build:downloadNodes:start',
    'copy:devSource',
    'babel:build',
    '_build:cliIndex',
    '_build:installedPlugins',
    '_build:packageJson',
    '_build:readme',
    '_build:installNpmDeps',
    'clean:testsFromModules',
    'clean:deepModules',
    'run:optimizeBuild',
    'stop:optimizeBuild',
    '_build:downloadNodes:finish',
    '_build:versionedLinks',
    '_build:archives',
    !grunt.option('os-packages') ? [] : [
      '_build:pleaseRun',
      '_build:osPackages',
    ],
    '_build:shasums'
  ]));
};
