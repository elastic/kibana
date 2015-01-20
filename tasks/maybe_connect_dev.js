module.exports = function (grunt) {
  var maybeStartServer = function (options) {
    return function () {
      var http = require('http');

      var req = http.request({
        method: 'HEAD',
        path: '/',
        host: 'localhost',
        port: options.port
      });

      function onResponse(res) {
        if (res.statusCode === 200) {
          grunt.log.writeln('server already started');
        } else {
          grunt.log.error('another server is already running at localhost:8000!');
        }
        done(res);
      }

      function onError() {
        grunt.config.set(options.name, true);
        grunt.task.run(options.tasks);
        done();
      }

      var done = (function (cb) {
        return function (res) {
          req.removeListener('error', onError);
          req.removeListener('response', onResponse);
          if (res) res.socket.destroy();
          cb();
        };
      })(this.async());

      req.on('error', onError);
      req.on('response', onResponse);
      req.end();
    };
  };
  grunt.registerTask('maybe_start_kibana', maybeStartServer({
    name: 'kibana-server',
    port: 5601,
    tasks: ['kibana_server']
  }));
};
