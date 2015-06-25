module.exports = function (grunt) {
  var _ = require('lodash');

  grunt.registerTask('kibana_server', function (keepalive) {
    require('./utils/dev_server')(grunt)
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

