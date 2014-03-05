module.exports = function (grunt) {
  var path = require('path');

  return {
    all: {
      src: [
        '<%= app %>/partials/**/*.jade',
        '<%= app %>/apps/**/*.jade',
        '<%= root %>/test/**/*.jade',
        '!<%= root %>/**/_*.jade'
      ],
      expand: true,
      ext: '.html',
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
        },
        client: false
      }
    }
  };
};