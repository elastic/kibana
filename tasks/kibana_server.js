module.exports = function (grunt) {
  grunt.registerTask('kibana_server', function (keepalive) {
    var done = this.async();
    var config = require('../src/server/config');
    config.quiet = !grunt.option('debug') && !grunt.option('verbose');
    if (grunt.option('port')) {
      config.port = config.kibana.port = grunt.option('port');
    }
    var server = require('../src/server');

    server.start(function (err) {
      if (err) return done(err);
      grunt.log.ok('Server started on port', config.kibana.port);
      if (keepalive !== 'keepalive') done();
    });
  });
};

