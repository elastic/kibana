var join = require('path').join;
module.exports = function (grunt) {
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
          mode: 0755
        },
        {
          src: [join(src, 'server', 'bin', 'kibana.bat')],
          dest: join(build, 'dist', 'kibana', 'bin', 'kibana.bat')
        }
      ]
    },
    build_props: {
      files: [
        {
          src: [join(app, 'index.html')],
          dest: join(build, 'src', 'index.html')
        }
      ]
    }
  };

  return config;
};
