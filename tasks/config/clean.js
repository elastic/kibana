module.exports = function () {
  return {
    build: 'build',
    target: 'target',
    screenshots: 'test/screenshots/session',
    testsFromModules: 'build/kibana/node_modules/**/{test,tests}/**',
    devSourceForTestbed: 'build/kibana/src/core_plugins/testbed/',
  };
};
