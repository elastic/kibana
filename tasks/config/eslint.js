var resolve = require('path').resolve;

module.exports = function (grunt) {
  return {
    // just lint the source dir
    source: {
      options: {
        cache: resolve(grunt.config.get('root'), '.eslint.fixSource.cache')
      },

      files: {
        src: '<%= lintThese %>'
      }
    },

    // just lint the source dir
    fixSource: {
      options: {
        cache: resolve(grunt.config.get('root'), '.eslint.fixSource.cache'),
        fix: true
      },

      files: {
        src: '<%= lintThese %>'
      }
    },

    staged: {}
  };
};
