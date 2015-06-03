module.exports = function (grunt) {
  var notIncludedComponents = '{font-awesome,requirejs,zeroclipboard,leaflet-draw}';
  return {
    build: '<%= build %>',
    target: '<%= target %>',
    unneeded_source_in_build: {
      src: [
        // select all top level folders in bower_components
        '<%= build %>/kibana/public/bower_components/*',

        // exclude the following top level components
        '!<%= build %>/kibana/public/bower_components/' + notIncludedComponents,

        // remove the all bower_components except for notIncludedComponents, and keep the one files they need
        '<%= build %>/kibana/public/bower_components/' + notIncludedComponents + '/*',
        '!<%= build %>/kibana/public/bower_components/requirejs/require.js',
        '!<%= build %>/kibana/public/bower_components/font-awesome/fonts',
        '!<%= build %>/kibana/public/bower_components/zeroclipboard/dist',
        '!<%= build %>/kibana/public/bower_components/leaflet-draw/dist',

        // delete the contents of the dist dir, except the ZeroClipboard.swf file
        '<%= build %>/kibana/public/bower_components/zeroclipboard/dist/*',
        '!<%= build %>/kibana/public/bower_components/zeroclipboard/dist/ZeroClipboard.swf',

        '<%= build %>/kibana/public/**/_empty_',
        '<%= build %>/kibana/public/**/*.less',
        '<%= build %>/kibana/public/config',
        '<%= build %>/kibana/public/{css-builder,normalize}.js',
        '<%= app %>/public/{css-builder,normalize}.js'
      ]
    },
    dev_only_plugins: '<%= build %>/src/plugins/<%= devPlugins %>',
    test_from_node_modules: '<%= build %>/dist/kibana/src/node_modules/**/*test*'
  };
};
