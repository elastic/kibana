module.exports = function (grunt) {
  var notIncludedComponents = '{font-awesome,requirejs}';
  return {
    build: '<%= build %>',
    target: '<%= target %>',
    unneeded_source_in_build: {
      src: [
        // select all top level folders in bower_components
        '<%= build %>/kibana/public/bower_components/*',
        // exclude the following top level components
        '!<%= build %>/kibana/public/bower_components/' + notIncludedComponents,
        // remove the contents of K4D3, font-awesome, and requirejs except necessary files
        '<%= build %>/kibana/public/bower_components/' + notIncludedComponents + '/*',
        '!<%= build %>/kibana/public/bower_components/requirejs/require.js',
        '!<%= build %>/kibana/public/bower_components/font-awesome/fonts',
        '<%= build %>/kibana/public/**/_empty_',
        '<%= build %>/kibana/public/**/*.less',
        '<%= build %>/kibana/public/config',
        '<%= build %>/kibana/public/{css-builder,normalize}.js',
        '<%= app %>/public/{css-builder,normalize}.js',
      ]
    }
  };
};
