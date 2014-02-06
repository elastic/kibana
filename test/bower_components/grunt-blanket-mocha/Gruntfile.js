/**
 * Example Gruntfile for Mocha setup
 */

'use strict';

module.exports = function(grunt) {

  var port = 8981;

  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/**/*.js', ],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    watch: {
      // If you want to watch files and run tests automatically on change
      test: {
        files: [
          'example/js/**/*.js',
          'example/test/spec/**/*.js',
          'phantomjs/*',
          'tasks/*',
          'Gruntfile.js'
        ],
        tasks: 'test'
      }
    },
      blanket_mocha : {
          test: {
              src: ['example/test.html'],
              options : {
                  threshold : 50,
                  globalThreshold : 65,
                  log : true,
                  logErrors: true,
                  moduleThreshold : 60,
                  modulePattern : "./src/(.*?)/"
              }
          }

      },

    connect: {
      testUrls: {
        options: {
          port: port,
          base: '.'
        }
      },
      testDest: {
        options: {
          port: port + 1,
          base: '.'
        }
      }
    }
  });

  grunt.registerTask('verifyDestResults', function () {
    var expected = ['spec', 'xunit'];

    expected.forEach(function (reporter) {
      var output = 'example/test/results/' + reporter + '.out';

      // simply check if the file is non-empty since verifying if the output is
      // correct based on the spec is kind of hard due to changing test running
      // times and different ways to report this time in reporters.
      if (!grunt.file.read(output, 'utf8'))
        grunt.fatal('Empty reporter output: ' + reporter);

      // Clean-up
      grunt.file.delete(output);
      grunt.log.ok('Reporter output non-empty for %s', reporter);
    });
  });

  // IMPORTANT: Actually load this plugin's task(s).
  // To use grunt-mocha, replace with grunt.loadNpmTasks('grunt-mocha')
  grunt.loadTasks('tasks');
  // grunt.loadNpmTasks('grunt-mocha');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-connect');

  // By default, lint and run all tests.
  grunt.task.registerTask('default', ['jshint', 'blanket_mocha']);
};
