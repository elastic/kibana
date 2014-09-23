module.exports = function (grunt) {
  var _ = require('lodash');
  var archiveName = function (plugin) {
    return '<%= target %>/<%= pkg.name %>-' + (plugin ? 'plugin-' : '') + '<%= pkg.version %>';
  };

  return _.mapValues({
    build_zip: archiveName() + '.zip',
    build_tarball: archiveName() + '.tar.gz',
    plugin: archiveName(true) + '.tar.gz'
  }, function (filename, task) {
    return {
      options: {
        archive: filename
      },
      files: [
        {
          flatten: true,
          src: '<%= build %>/dist/bin/kibana',
          dest: '<%= pkg.name %>/bin/kibana',
          mode: 755
        },
        {
          flatten: true,
          src: '<%= build %>/dist/bin/kibana.bat',
          dest: '<%= pkg.name %>/bin/kibana.bat'
        },
        {
          expand: true,
          cwd: '<%= build %>/dist/config',
          src: ['**/*'],
          dest: '<%= pkg.name %>/config'
        },
        {
          expand: true,
          cwd: '<%= build %>/dist/lib',
          src: ['**/*'],
          dest: '<%= pkg.name %>/lib'
        },
        {
          expand: true,
          cwd: '<%= build %>/dist',
          src: ['*.txt'],
          dest: '<%= pkg.name %>'
        }
      ]
    };
  });
};
