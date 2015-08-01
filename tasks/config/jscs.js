module.exports = function (grunt) {
  return {
    options: {
      config: '.jscsrc'
    },

    // just lint the source dir
    source: {
      src: '<%= lintThese %>',
    },

    // fix any linting errors that can be fixed
    fixup: {
      src: '<%= lintThese %>',
      options: {
        fix: true
      }
    }
  };
};
