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
    clientside_jade: {
      files: [
        '<%= testUtilsDir %>/istanbul_reporter/report.clientside.jade'
      ],
      tasks: ['jade:clientside']
    },
    kibana_server: {
      options: {
        spawn: false
      },
      files: [
        'src/server/**/*.rb',
        'src/server/**/*.yml'
        ],
      tasks: [
        'stop:kibana_server',
        'run:kibana_server'
        ]
    }
  };

  if (grunt.option('no-test-watcher')) {
    // unset the test watcher
    delete config.test;
  }

  return config;
};
