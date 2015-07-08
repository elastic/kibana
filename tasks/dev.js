module.exports = function (grunt) {
  var _ = require('lodash');

  grunt.registerTask('dev', function () {
    var tasks = [
      'less:dev',
      'jade',
      'esvm:dev',
      'maybeStartKibana',
      'watch'
    ];

    if (!grunt.option('with-es')) {
      _.pull(tasks, 'esvm:dev');
    }

    grunt.task.run(tasks);
  });

  grunt.registerTask('devServer', function (keepalive) {
    var port = grunt.option('port');
    var quiet = !(grunt.option('debug') || grunt.option('verbose'));

    require('../src/devServer').run(port, quiet)
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
