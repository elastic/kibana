module.exports = function (grunt) {
  return {
    options: {
      log: true,
      logErrors: true,
      run: false,
      page: {
        settings: {
          viewportSize: {
            width: 2400,
            height: 1250
          }
        }
      }
    },
    unit: {
      options: {
        urls: [
          'http://localhost:' + (grunt.option('port') || '5601') + '/test/unit/'
        ]
      }
    }
  };
};
