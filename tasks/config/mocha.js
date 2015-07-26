module.exports = function (grunt) {
  return {
    unit: {
      options: {
        log: true,
        logErrors: true,
        run: false,
        timeout: 120000,
        page: {
          settings: {
            viewportSize: {
              width: 2400,
              height: 1250
            }
          }
        },
        urls: [
          'http://localhost:' + (grunt.option('port') || '5601') + '/tests'
        ]
      }
    }
  };
};
