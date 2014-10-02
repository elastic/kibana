module.exports = function (grunt) {
  return {
    // just lint the source dir
    source: {
      files: {
        src: [
          'Gruntfile.js',
          '<%= root %>/tasks/**/*.js',
          '<%= src %>/kibana/*.js',
          '<%= src %>/kibana/{apps,components,controllers,directives,factories,filters,services,utils}/**/*.js',
          '<%= unitTestDir %>/**/*.js'
        ]
      }
    },
    options: {
      jshintrc: true
    }
  };
};
