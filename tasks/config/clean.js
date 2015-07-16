module.exports = function (grunt) {
  var notIncludedComponents = '{font-awesome,requirejs,zeroclipboard,leaflet-draw}';
  return {
    build: '<%= build %>',
    target: '<%= target %>',
    noDistPlugins: '<%= build %>/src/plugins/<%= noDistPlugins %>'
  };
};
