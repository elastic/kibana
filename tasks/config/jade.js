module.exports = function (grunt) {
  return {
    test: {
      src: [
        '<%= unitTestDir %>/**/*.jade',
        '<%= app %>/partials/**/*.jade',
        '<%= app %>/apps/**/*.jade'
      ],
      expand: true,
      ext: '.html',
      options: {
        data: function (src, dest) {
          var pattern = grunt.config.process('<%= unitTestDir %>/**/*.js');
          var tests = grunt.file.expand({}, pattern).map(function (filename) {
            return filename.replace(grunt.config.get('unitTestDir'), '');
          });
          return { tests: JSON.stringify(tests) };
        },
        client: false
      }
    }
  };
};

