module.exports = function (grunt) {
  var testFiles = [
    'common/**/*.js',
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
    common: {
      files: ['common/**/*.js'],
      tasks: ['replace:dev_marvel_config']

    },
    dev: {
      files: testFiles,
      tasks: [ 'jade:test', 'replace:dev_marvel_config'],
      options: {
        livereload: true,
      }
    }
  };
};
