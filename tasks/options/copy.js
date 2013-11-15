module.exports = function(config) {
  return {
    plugin_to_marvel: {
      cwd: 'target',
      expand: true,
      src: ['<%= pkg.name %>-<%= pkg.version %>.jar'],
      dest: '<%= buildDir %>'
    }
  };
};