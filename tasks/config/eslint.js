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

    // lint the source and fix any fixable errors
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
