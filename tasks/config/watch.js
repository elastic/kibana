module.exports = function (grunt) {
  var config = {
    test: {
      files: [
        '<%= unitTestDir %>/**/*.js'
      ],
      tasks: ['mocha:unit']
    },
    less: {
      files: [
        '<%= app %>/**/styles/**/*.less',
        '<%= app %>/**/components/**/*.less',
        '<%= app %>/**/components/vislib/components/styles/**/*.less'
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

  if (grunt.option('no-test-watcher')) {
    // unset the test watcher
    delete config.test;
  }

  return config;
};
