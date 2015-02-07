module.exports = function (grunt) {
  return {
    // just lint the source dir
    source: {
      src: '<%= lintThese %>'
    },
    options: {
      config: '.jscsrc'
    }
  };
};
