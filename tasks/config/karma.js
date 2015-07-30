module.exports = function (grunt) {
  return {
    unit: {
      configFile: 'karma.conf.js',
      singleRun: true,
      reporters: 'dots',
      browsers: [
        '<%= karmaBrowser %>'
      ]
    }
  };
};
