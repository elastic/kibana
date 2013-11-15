module.exports = function(config) {
  return {
    zip: {
      options: {
        archive: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.zip'
      },
      files : [
        {
          expand: true,
          cwd: '<%= buildDir %>',
          src: ['**/*'],
          dest: ''
        }
      ]
    },
    tgz: {
      options: {
        archive: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.tar.gz'
      },
      files : [
        {
          expand: true,
          cwd: '<%= buildDir %>',
          src: ['**/*'],
          dest: ''
        }
      ]
    }
  };
};