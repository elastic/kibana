module.exports = function (grunt) {
  grunt.registerTask('kibana_server', function (keepalive) {
    var done = this.async();
    var kibana = require('../');
    var devStatics = require('./utils/dev_statics');
    var quiet = !grunt.option('debug') && !grunt.option('verbose');
    var settings = { 'logging.quiet': quiet };

    kibana.start(settings, [devStatics]).then(function (server) {
      grunt.log.ok('Server started: ' + server.info.uri);
      if (keepalive !== 'keepalive') done();
    }).catch(done);

  });
};

