import path from 'path';


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
    api: {
      options: {
        runType: 'client',
        config: 'test/intern_api'
      }
    },
    visualRegression: {
      options: {
        runType: 'runner',
        config: 'test/intern_visual_regression'
      }
    }
  };
};
