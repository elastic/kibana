module.exports = function (grunt) {
  var _ = require('lodash');

  grunt.registerTask('devServer', function (keepalive) {
    var quiet = !(grunt.option('debug') || grunt.option('verbose'));
    var port = grunt.option('port');

    require('../src/dev_server').run(port, quiet)
    .then(function (server) {
      grunt.log.ok('Server started: ' + server.info.uri);
      if (keepalive) {
        // return a never resolving promise
        return new Promise(_.noop);
      }
    })
    .nodeify(this.async());
  });
};

