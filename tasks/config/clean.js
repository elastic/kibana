module.exports = function (grunt) {
  let modules = Object.keys(grunt.config.get('deepModules'));
  return {
    build: 'build',
    target: 'target',
    screenshots: 'test/screenshots/session',
    testsFromModules: 'build/kibana/node_modules/**/{test,tests}/**',
    deepModuleBins: 'build/kibana/node_modules/*/node_modules/**/.bin/{' + modules.join(',') + '}',
    deepModules: 'build/kibana/node_modules/*/node_modules/**/{' + modules.join(',') + '}/',
  };
};
