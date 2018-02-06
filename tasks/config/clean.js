module.exports = function () {
  return {
    build: 'build',
    target: 'target',
    testsFromModules: 'build/kibana/node_modules/**/{test,tests}/**',
    examplesFromModules: 'build/kibana/node_modules/**/{example,examples}/**',
    devSourceForTestbed: 'build/kibana/src/core_plugins/testbed/',
    nodeForOptimize: 'build/kibana/node',
    packages: 'build/kibana/packages'
  };
};
