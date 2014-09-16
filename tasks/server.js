module.exports = function (grunt) {
  grunt.registerTask('server', function (keepalive) {
    var done = this.async();
    var DevServer = require('../test/utils/dev_server');
    var server = new DevServer();

    server.listen(8000).then(function () {
      console.log('visit http://localhost:8000');

      if (keepalive !== 'keepalive') {
        done();
      }
    });
  });
};