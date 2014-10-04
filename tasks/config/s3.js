module.exports = function (config) {
  return {
    release: {
      bucket: 'download.elasticsearch.org',
      access: 'private',
      //debug: true, // uncommment to prevent actual upload
      upload: [
        {
          src: 'target/<%= pkg.name %>-<%= pkg.version %>.zip',
          dest: 'kibana/kibana/<%= pkg.name %>-<%= pkg.version %>.zip',
        },
        {
          src: 'target/<%= pkg.name %>-<%= pkg.version %>.tar.gz',
          dest: 'kibana/kibana/<%= pkg.name %>-<%= pkg.version %>.tar.gz',
        }
      ]
    }
  };
};