module.exports = function (grunt) {
  grunt.registerTask('kibana_server', function (keepalive) {
    var done = this.async();

    require('./utils/dev_server')({
      'logging.quiet': !grunt.option('debug') && !grunt.option('verbose'),
      'kibana.server.port': grunt.option('port')
    })
    .then(function (server) {
      grunt.log.ok('Server started: ' + server.info.uri);
      if (keepalive !== 'keepalive') done();
    })
    .catch(done);

  });
};

