module.exports = function (config) {
  return {
    // just lint the source dir
    source: {
      src: [
        'Gruntfile.js',
        'panels/**/*.js',
        'dashboards/**/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    sense: {
      src: '<%= senseDir %>/app/**/*.js',
      options: {
        jshintrc: true
      }
    }
  };
};