module.exports = function (grunt) {
  var kibana_server_tasks = [];
  if (grunt.option('use-jruby')) {
    kibana_server_tasks = [
      'stop:mri_server',
      'run:mri_server'
    ];
  } else {
    kibana_server_tasks = [
      'stop:jruby_server',
      'run:jruby_server'
    ];
  }
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
    clientside_jade: {
      files: [
        '<%= testUtilsDir %>/istanbul_reporter/report.clientside.jade'
      ],
      tasks: ['jade:clientside']
    },
    kibana_server: {
      files: [
        'src/server/**/*.rb',
        'src/server/**/*.yml'
      ],
      tasks: kibana_server_tasks,
      options: {
        spawn: false
      }
    }
  };

  if (grunt.option('no-test-watcher')) {
    // unset the test watcher
    delete config.test;
  }

  return config;
};
