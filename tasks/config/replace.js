var join = require('path').join;
module.exports = function (grunt) {
  var pkg = grunt.config.get('pkg');
  var build = grunt.config.get('build');
  var src = grunt.config.get('src');
  var config = {
    dist: {
      options: {
        patterns: [
          { match: 'version', replacement: pkg.version  }
        ]
      },
      files: [
        {
          src: [join(src, 'server', 'README.md')],
          dest: join(build, 'dist', 'README.md')
        },
        {
          src: [join(src, 'server', 'bin', 'kibana.sh')],
          dest: join(build, 'dist', 'bin', 'kibana')
        },
        {
          src: [join(src, 'server', 'bin', 'kibana.bat')],
          dest: join(build, 'dist', 'bin', 'kibana.bat')
        }
      ]
    }
  };

  return config;
};
