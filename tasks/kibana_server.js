module.exports = function (grunt) {
  grunt.registerTask('kibana_server', function (keepalive) {
    var done = this.async();
    var config = require('../src/server/config');
    config.quiet = true;
    var server = require('../src/server');

    server.start(function () {
      grunt.log.ok('Server started on port', config.kibana.port);
      if (keepalive !== 'keepalive') done();
    });
  });
};

