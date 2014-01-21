module.exports = function (config) {
  return {
    // just lint the source dir
    kibana: {
      src: [
        'Gruntfile.js',
        'kibana/panels/**/*.js',
        'kibana/dashboards/**/*.js'
      ],
      options: {
        jshintrc: 'kibana/.jshintrc'
      }
    },
    sense: {
      src: '<%= senseDir %>/app/**/*.js',
      options: {
        jshintrc: 'sense/.jshintrc'
      }
    }
  };
};