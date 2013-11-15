module.exports = function(config) {
  return {
    release: {
      bucket: 'download.elasticsearch.org',
      access: 'private',
      //debug: true, // uncommment to prevent actual upload
      upload: [
        {
          src: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.zip',
          dest: 'elasticsearch/<%= pkg.name %>/<%= pkg.name %>-<%= pkg.version %>.zip',
        },
        {
          src: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.tar.gz',
          dest: 'elasticsearch/<%= pkg.name %>/<%= pkg.name %>-<%= pkg.version %>.tar.gz',
        }
      ]
    }
  };
};