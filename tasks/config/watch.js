module.exports = function (grunt) {
  return {
    test: {
      files: [
        '<%= unitTestDir %>/**/*.js'
      ],
      tasks: ['mocha:unit']
    },
    less: {
      files: [
        '<%= app %>/**/styles/**/*.less',
        '!<%= src %>/**/_*.less'
      ],
      tasks: ['less']
    },
    jade: {
      files: [
        '<%= unitTestDir %>/index.jade'
      ],
      tasks: ['jade:test']
    },
    clientside_jade: {
      files: [
        '<%= testUtilsDir %>/istanbul_reporter/report.clientside.jade'
      ],
      tasks: ['jade:clientside']
    }
  };
};
