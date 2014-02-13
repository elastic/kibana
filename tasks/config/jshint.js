module.exports = function(config) {
  return {
    // just lint the source dir
    source: {
      files: {
        src: ['Gruntfile.js', '<%= root %>/src/**/*.js']
      }
    },
    options: {
      jshintrc: '<%= root %>/.jshintrc',
      ignores: [
        'node_modules/*',
        'dist/*',
        'sample/*',
        '<%= root %>/src/bower_components/**/*'
      ]
    }
  };
};