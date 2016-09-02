module.exports = function (grunt) {
  return {
    options: {
      runType: 'runner',
      config: 'test/intern',
      bail: true,
      reporters: ['Console'],
      grep: grunt.option('grep'),
      functionalSuites: grunt.option('functionalSuites'),
      appSuites: grunt.option('appSuites')
    },
    dev: {},
    visualRegression: {
      options: {
        runType: 'runner',
        config: 'test/intern_visual_regression'
      }
    }
  };
};
