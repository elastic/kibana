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
        '<%= plugins %>/*/styles/**/*.less',
        '<%= plugins %>/*/*.less',
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

  var ruby_server = grunt.config.get('ruby_server');
  if (ruby_server) {
    config.kibana_server = {
      files: [
        'src/server/**/*.rb',
        'src/server/**/*.yml'
      ],
      tasks: [
        'stop:' + ruby_server,
        'run:' + ruby_server
      ],
      options: {
        spawn: false
      }
    };
  }

  return config;
};
