module.exports = function (grunt) {
  return {
    dev: {
      configFile: 'karma.conf.js',
      reporters: 'dots',
      browsers: [
        '<%= karmaBrowser %>'
      ]
    },
    ci: {
      singleRun: true,
      configFile: 'karma.conf.js',
      reporters: 'dots',
      browsers: [
        '<%= karmaBrowser %>'
      ]
    },
  };
};
