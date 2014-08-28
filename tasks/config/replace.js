var join = require('path').join;
module.exports = function (grunt) {
  var pkg = grunt.config.get('pkg');
  var build = grunt.config.get('build');
  var config = {
    dist: {
      options: {
        patterns: [
          { match: 'version', replacement: pkg.version  }
        ]
      },
      files: [
        {
          src: [join(build, 'kibana', 'bin', 'kibana.sh')],
          dest: join(build, 'dist', 'bin', 'kibana')
        },
        {
          src: [join(build, 'kibana', 'bin', 'kibana.bat')],
          dest: join(build, 'dist', 'bin', 'kibana.bat')
        }
      ]
    }
  };

  return config;
};
