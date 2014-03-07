module.exports = function (grunt) {
  var path = require('path');

  return {
    options: {
      compileDebug: false
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