module.exports = function(config) {
  return {
    dev: {
      options: {
        port: 5601,
        base: config.srcDir,
        keepalive: true
      }
    },
    unit_tests: {
      options: {
        port: 5602,
        keepalive: true,
        middleware: function (connect) {
          return [
            // mainly just for index.html
            connect.static(config.unitTestDir),
            // for the modules to test
            connect.static(config.srcDir),
            // contains mocha.js
            connect.static('node_modules/mocha'),
            // contains expect.js
            connect.static('node_modules/expect.js'),
            // bundle the spec files into one file that changes when needed
            function (req, resp, next) {
              if (req.url !== '/specs.js') {
                return next();
              }

              var Kat = require('kat');
              resp.statusCode = 200;
              resp.setHeader('Content-Type', 'application/javascript');
              var read = new Kat();
              require('glob')(config.unitTests, function (err, files) {
                if (err) {
                  next(err);
                  return;
                }

                files.forEach(function (file) {
                  read.add(file);
                });
                read.pipe(resp);
              });
            }
          ];
        }
      }
    }
  };
};