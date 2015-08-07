module.exports = function (grunt) {
  var { join } = require('path');

  var build = grunt.config.get('build');
  var src = grunt.config.get('src');
  var app = grunt.config.get('app');

  var config = {
    options: {
      patterns: [
        { match: 'version', replacement: '<%= pkg.version %>' },
        { match: 'buildNum', replacement: '<%= buildNum %>' },
        { match: 'commitSha', replacement: '<%= commitSha %>' }
      ]
    },
    dist: {
      files: [
        {
          src: [join(src, 'server', 'bin', 'kibana.sh')],
          dest: join(build, 'dist', 'kibana', 'bin', 'kibana'),
          mode: parseInt('0755', 8)
        },
        {
          src: [join(src, 'server', 'bin', 'kibana.bat')],
          dest: join(build, 'dist', 'kibana', 'bin', 'kibana.bat')
        },
        {
          src: [join(src, 'server', 'config', 'index.js')],
          dest: join(build, 'dist', 'kibana', 'src', 'config', 'index.js')
        }
      ]
    }
  };

  return config;
};
