module.exports = function (config) {
  return {
    // just lint the source dir
    source: {
      files: {
        src: [
          'Gruntfile.js',
          '<%= src %>/**/*.js',
          '<%= unitTestDir %>/**/*.js',
          '<%= root %>/tasks/**/*.js'
        ]
      }
    },
    options: {
      jshintrc: true,
      ignores: [
        'node_modules/*',
        'dist/*',
        'sample/*',
        '<%= root %>/src/bower_components/**/*'
      ]
    }
  };
};