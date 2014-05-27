module.exports = function (config) {
  return {
    // just lint the source dir
    source: {
      files: {
        src: [
          'Gruntfile.js',
          '<%= src %>/*.js',
          '<%= src %>/kibana/**/*.js',
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
        'sample/*'
      ]
    }
  };
};