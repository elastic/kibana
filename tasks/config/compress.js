module.exports = function (config) {
  return {
    plugin: {
      options: {
        archive: '<%= build %>/<%= pkg.name %>-plugin-<%= pkg.version %>.tar.gz'
      },
      files : [
        {
          expand: true,
          cwd: 'src',
          src: ['**/*'],
          dest: '<%= pkg.name %>/_site'
        }
      ]
    }
  };
};