module.exports = function (grunt) {
  let { flatten } = require('lodash');

  grunt.registerTask('build', flatten([
    'build:getProps',
    'clean:build',
    'clean:target',
    'build:downloadNodes:start',
    'copy:devSource',
    'babel:build',
    'build:cliIndex',
    'build:installedPlugins',
    'build:packageJson',
    'build:readme',
    'build:installNpmDeps',
    'run:optimizeBuild',
    'stop:optimizeBuild',
    'build:downloadNodes:finish',
    'clean:testsFromModules',
    'build:versionedLinks',
    'build:archives',
    !grunt.option('os-packages') ? [] : [
      'build:pleaseRun',
      'build:pleaseManageUser',
      'build:osPackages',
    ],
    'build:shasums'
  ]));
};
