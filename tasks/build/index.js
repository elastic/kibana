import { flatten } from 'lodash';
module.exports = function (grunt) {
  grunt.registerTask('build', 'Build packages', function () {
    grunt.task.run(flatten([
      // We specifically bootstrap Kibana to make sure all dependencies are
      // up-to-date before kicking of the rest of the build process
      'bootstrapKibana',
      'clean:build',
      'clean:target',
      '_build:downloadNodeBuilds',
      '_build:extractNodeBuilds',
      'copy:devSource',
      'clean:devSourceForTestbed',
      'babel:build',
      '_build:plugins',
      '_build:data',
      '_build:verifyTranslations',
      '_build:packageJson',
      '_build:readme',
      '_build:babelCache',
      '_build:packages',
      '_build:installDependencies',
      'clean:packages',
      '_build:notice',
      '_build:removePkgJsonDeps',
      'clean:testsFromModules',
      'clean:examplesFromModules',
      '_build:copyNodeForOptimize',
      'run:optimizeBuild',
      'stop:optimizeBuild',
      'clean:nodeForOptimize',
      '_build:versionedLinks',
      '_build:osShellScripts',
      grunt.option('skip-archives') ? [] : ['_build:archives'],
      grunt.option('skip-os-packages') ? [] : ['_build:osPackages'],
      '_build:shasums'
    ]));
  });
};
