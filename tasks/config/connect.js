module.exports = function (grunt) {
  var instrumentationMiddleware = require('../utils/instrumentation');
  var amdWrapMiddleware = require('../utils/amd-wrapper');

  return {
    dev: {
      options: {
        middleware: function (connect, options, stack) {
          stack = stack || [];

          var root = grunt.config.get('root');

          // when a request for an intrumented file comes in (?instrument=true)
          // and it is included in `pattern`, it will be handled
          // by this middleware
          stack.push(instrumentationMiddleware({
            // root that files should be served from
            root: root,

            // make file names easier to read
            displayRoot: grunt.config.get('src'),

            // filter the filenames that will be served
            filter: function (filename) {
              // return true if the filename should be
              // included in the coverage report (results are cached)
              return grunt.file.isMatch([
                '**/src/**/*.js',
                '!**/src/bower_components/**/*',
                '!**/src/kibana/utils/{event_emitter,next_tick}.js'
              ], filename);
            }
          }));

          // minimize code duplication (especially in the istanbul reporter)
          // by allowing node_modules to be requested in an AMD wrapper
          stack.push(amdWrapMiddleware({
            root: root
          }));

          // standard static middleware reading from the root
          stack.push(connect.static(root));

          // allow browsing directories
          stack.push(connect.directory(root));

          // redirect requests for '/' to '/src/'
          stack.push(function (req, res, next) {
            if (req.url !== '/') return next();
            res.statusCode = 303;
            res.setHeader('Location', '/src/');
            res.end();
          });

          return stack;
        }
      }
    }
  };
};