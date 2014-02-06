module.exports = function (grunt) {
  var testFiles = [
    'kibana/**/*.js',
    'test/**/*.js',
    'test/templates/**/*.jade'
  ];
  return {
    test: {
      files: testFiles,
      tasks: [ 'jade:test', 'mocha:unit' ]
    },
    less: {
      files: ['kibana/panels/**/*.less'],
      tasks: ['less']
    },
    dev: {
      files: testFiles,
      tasks: [ 'jade:test' ],
      options: {
        livereload: true,
      }
    }
  };
};
