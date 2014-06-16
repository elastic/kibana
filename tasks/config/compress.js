module.exports = function (config) {
  return {
    plugin: {
      options: {
        archive: '<%= build %>/<%= pkg.name %>-plugin-latest.tar.gz'
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