module.exports = function (grunt) {
  return {
    unit: {
      configFile: 'karma.conf.js',
      singleRun: true,
      browsers: ['Chrome']
    }
  };
};
