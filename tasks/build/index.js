module.exports = function (grunt) {
  let { flatten } = require('lodash');

  grunt.registerTask('build', 'Build packages', function () {
    grunt.task.run(flatten([
      'clean:build',
      'clean:target',
      '_build:downloadNodeBuilds:start',
      'copy:devSource',
      'babel:build',
      '_build:babelOptions',
      '_build:installedPlugins',
      '_build:data',
      '_build:packageJson',
      '_build:readme',
      '_build:babelCache',
      '_build:installNpmDeps',
      '_build:removePkgJsonDeps',
      'clean:testsFromModules',
      'run:optimizeBuild',
      'stop:optimizeBuild',
      '_build:downloadNodeBuilds:finish',
      '_build:versionedLinks',
      grunt.option('skip-archives') ? [] : ['_build:archives'],
      grunt.option('skip-os-packages') ? [] : [
        '_build:pleaseRun',
        '_build:osPackages',
      ],
      '_build:shasums'
    ]));
  });
};
