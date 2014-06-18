module.exports = function (grunt) {
  var notIncludedComponents = '{K4D3,font-awesome,requirejs}';
  return {
    build: '<%= build %>',
    target: '<%= target %>',
    unneeded_source_in_build: {
      src: [
        // select all top level folders in bower_components
        '<%= build %>/bower_components/*',
        // exclude the following top level components
        '!<%= build %>/bower_components/' + notIncludedComponents,

        // remove the contents of K4D3, font-awesome, and requirejs except necessary files
        '<%= build %>/bower_components/' + notIncludedComponents + '/*',
        '!<%= build %>/bower_components/K4D3/build',
        '!<%= build %>/bower_components/requirejs/require.js',
        '!<%= build %>/bower_components/font-awesome/fonts',

        // remove extra builds from K4D3
        '<%= build %>/bower_components/K4D3/build/*',
        '!<%= build %>/bower_components/K4D3/build/k4.d3.js',

        '<%= build %>/**/_empty_',
        '<%= build %>/**/*.less',
        '<%= appBuild %>/{css-builder,normalize}.js',
        '<%= app %>/{css-builder,normalize}.js',
      ]
    }
  };
};