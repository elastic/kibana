module.exports = function (grunt) {
  var maybeStartServer = function (options) {
    return function () {
      var http = require('http');
      var opts = {
        method: 'HEAD',
        path: '/api/status',
        host: 'localhost',
        port: options.port
      };

      grunt.log.debug('checking for server', JSON.stringify(opts));

      var req = http.request(opts);

      function onResponse(res) {
        grunt.log.debug('Server responded with', res.statusCode);
        if (res.statusCode === 200 && res.headers['x-app-name'] === 'kibana') {
          grunt.log.ok('Kibana server already started on port', options.port);
        } else {
          grunt.log.error('Another server is already running on port', options.port);
          process.exit(1);
        }
        done(res);
      }

      function onError(err) {
        if (err.code !== 'ECONNREFUSED') {
          grunt.log.error('Kibana server check failed', err);
        }

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

  grunt.registerTask('maybeStartKibana', maybeStartServer({
    name: 'kibana-server',
    port: grunt.option('port') || 5601,
    tasks: ['run:devServer']
  }));
};
