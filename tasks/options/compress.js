module.exports = function (config) {
  return {
    zip: {
      options: {
        archive: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.zip'
      },
      files: [
        {
          expand: true,
          cwd: '<%= buildMergeDir %>/dist',
          src: ['**/*'],
          dest: '_site'
        },
        {
          expand: true,
          cwd: '<%= buildDir %>',
          src: ['*.jar'],
          dest: ''
        }
      ]
    },
    tgz: {
      options: {
        archive: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.tar.gz'
      },
      files: [
        {
          expand: true,
          cwd: '<%= buildMergeDir %>/dist',
          src: ['**/*'],
          dest: '_site'
        },
        {
          expand: true,
          cwd: '<%= buildDir %>',
          src: ['*.jar'],
          dest: ''
        }
      ]
    }
  };
};