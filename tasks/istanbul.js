var isparta = require('isparta');
var babelOptions = require('../src/optimize/babel_options').node;
module.exports = function (grunt) {

  grunt.config.merge({
    instrument: {
      files: 'src/**/*.js',
      options: {
        lazy: true,
        basePath: 'coverage/istanbul/',
        babel: babelOptions,
        instrumenter: isparta.Instrumenter
      }
    },
    storeCoverage: {
      options: {
        dir: 'coverage/istanbul/reports'
      }
    },
    makeReport: {
      src: 'coverage/istanbul/reports/**/*.json',
      options: {
        type: 'cobertura',
        dir: 'coverage/reports/',
        print: 'detail'
      }
    }
  });

};
