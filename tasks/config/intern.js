var path = require('path');


module.exports = function (grunt) {
  return {
    options: {
      bail: true,
      reporters: ['Console'],
      grep: grunt.option('grep'),
      functionalSuites: grunt.option('functionalSuites'),
      appSuites: grunt.option('appSuites')
    },
    dev: {
      options: {
        runType: 'runner',
        config: grunt.option('internConfigFile') || 'test/intern'
      }
    },
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
