module.exports = function () {
  return {
    // just lint the source dir
    source: {
      files: {
        src: '<%= lintThese %>'
      }
    },

    // lint the source and fix any fixable errors
    fixSource: {
      options: {
        fix: true
      },

      files: {
        src: '<%= lintThese %>'
      }
    },

    staged: {}
  };
};
