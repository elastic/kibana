module.exports = function (grunt) {
  return {
    // just lint the source dir
    source: {
      files: {
        src: '<%= lintThese %>'
      }
    },
    options: {
      jshintrc: true
    }
  };
};
