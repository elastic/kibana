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
        '<%= app %>/**/*.less',
        '<%= app %>/**/styles/**/*.less',
        '<%= app %>/**/components/**/*.less'
      ],
      tasks: ['less']
    },
    jade: {
      files: [
        '<%= unitTestDir %>/index.jade'
      ],
      tasks: ['jade:test']
    },
    docs: {
      files: [
        '<%= app %>/**/*.js'
      ],
      tasks: ['yuidoc']
    },
    clientside_jade: {
      files: [
        '<%= testUtilsDir %>/istanbul_reporter/report.clientside.jade'
      ],
      tasks: ['jade:clientside']
    }
  };

  if (grunt.option('no-test-watcher')) delete config.test;
  if (!grunt.option('doc-watcher'))    delete config.docs;

  return config;
};
