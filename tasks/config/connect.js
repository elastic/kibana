var lessMiddleware = require('less-middleware');

module.exports = function (grunt) {
  return {
    dev: {
      options: {
        middleware: function (connect, options, middlewares) {
          var src = grunt.config.get('src');
          return [
            lessMiddleware({
              src: src
            }),
            connect.static(src)
          ];
        }
      }
    },
    test: {
      options: {
        base: [
          '<%= unitTestDir %>',
          '<%= testUtilsDir %>',
          '<%= src %>',
          '<%= root %>/node_modules/mocha',
          '<%= root %>/node_modules/expect.js'
        ],
        port: 8001
      }
    }
  };
};