module.exports = function (config) {
  return {
    // just lint the source dir
    source: {
      files: {
        src: ['Gruntfile.js', 'panels/**/*.js', 'dashboards/**/*.js']
      }
    },
    options: {
      jshintrc: '.jshintrc'
    }
  };
};