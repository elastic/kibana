module.exports = function (grunt) {
  return {
    test: {
      options: {
        data: function (src, dest) {
          var pattern = grunt.config.process('<%= unitTestDir %>/**/*.js');
          var tests = grunt.file.expand({}, pattern).map(function (filename) {
            return filename.replace(grunt.config.get('unitTestDir'), '');
          });
          return { tests: JSON.stringify(tests) };
        },
        client: false
      },
      files: {
        '<%= unitTestDir %>/index.html': '<%= unitTestDir %>/index.jade'
      }
    }
  };
};

