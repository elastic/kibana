module.exports = function (grunt) {
  grunt.registerTask('maybe_start_server', function () {
    var http = require('http');

    var req = http.request({
      method: 'HEAD',
      path: '/',
      host: 'localhost',
      port: 8000
    });

    function onResponse(res) {
      if (res.headers.pong === 'Kibana 4 Dev Server') {
        grunt.log.writeln('server already started');
      } else {
        grunt.log.error('another server is already running at localhost:8000!');
      }
      done(res);
    }

    function onError() {
      grunt.task.run(['server']);
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
  });
};