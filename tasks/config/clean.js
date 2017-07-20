module.exports = function () {
  return {
    build: 'build',
    target: 'target',
    testsFromModules: 'build/kibana/node_modules/**/{test,tests}/**',
  };
};
