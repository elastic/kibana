module.exports = function (grunt) {
  var path = require('path');

  return {
    options: {
      compileDebug: false
    },
    test: {
      files: {
        '<%= unitTestDir %>/index.html': '<%= unitTestDir %>/index.jade'
      },
      options: {
        data: function (src, dest) {
          var unitTestDir = grunt.config.get('unitTestDir');

          // filter for non unit test related files
          if (!~path.dirname(src).indexOf(unitTestDir)) return;

          var pattern = unitTestDir + '/specs/**/*.js';
          var appdir = grunt.config.get('app');

          return {
            tests: grunt.file.expand({}, pattern).map(function (filename) {
              return path.relative(appdir, filename).replace(/\.js$/, '');
            })
          };
        }
      }
    },
    clientside: {
      files: {
        '<%= testUtilsDir %>/istanbul_reporter/report.jade.js': '<%= testUtilsDir %>/istanbul_reporter/report.clientside.jade'
      },
      options: {
        client: true,
        amd: true,
        namespace: false // return the template directly in the amd wrapper
      }
    }
  };
};