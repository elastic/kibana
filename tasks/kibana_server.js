module.exports = function (grunt) {
  grunt.registerTask('kibana_server', function (keepalive) {
    var done = this.async();
    var Kibana = require('../');
    var devStatics = require('./utils/dev_statics');
    var quiet = !grunt.option('debug') && !grunt.option('verbose');
    var port = grunt.option('port');
    var settings = { 'logging.quiet': quiet };
    if (grunt.option('port')) {
      settings['kibana.server.port'] = grunt.option('port');
    }

    var kibana = new Kibana(settings, [devStatics]);
    kibana.listen().then(function (server) {
      grunt.log.ok('Server started: ' + server.info.uri);
      if (keepalive !== 'keepalive') done();
    }).catch(done);

  });
};

