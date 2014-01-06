module.exports = function (config, grunt) {
  var upload;

  if (grunt.option('latest')) {
    upload = [
      {
        src: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.zip',
        dest: 'elasticsearch/<%= pkg.name %>/<%= pkg.name %>-latest.zip',
      },
      {
        src: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.tar.gz',
        dest: 'elasticsearch/<%= pkg.name %>/<%= pkg.name %>-latest.tar.gz',
      }
    ];
  } else {
    upload = [
      {
        src: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.zip',
        dest: 'elasticsearch/<%= pkg.name %>/<%= pkg.name %>-<%= pkg.version %>.zip',
      },
      {
        src: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.tar.gz',
        dest: 'elasticsearch/<%= pkg.name %>/<%= pkg.name %>-<%= pkg.version %>.tar.gz',
      }
    ];
  }

  return {
    release: {
      bucket: 'download.elasticsearch.org',
      access: 'private',
      //debug: true, // uncommment to prevent actual upload
      upload: upload
    }
  };
};