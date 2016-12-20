module.exports = function (grunt) {
  return {
    build: 'build',
    target: 'target',
    testsFromModules: 'build/kibana/node_modules/**/{test,tests}/**',
  };
};
