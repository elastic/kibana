module.exports = function () {
  return {
    build: 'build',
    target: 'target',
    testsFromModules: 'build/kibana/node_modules/**/{test,tests}/**',
    examplesFromModules: 'build/kibana/node_modules/**/{example,examples}/**',
    nodeForOptimize: 'build/kibana/node',
    packages: 'build/kibana/packages'
  };
};
