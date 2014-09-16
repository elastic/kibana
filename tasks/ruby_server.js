var request = require('request');
module.exports = function (grunt) {
  grunt.registerTask('ruby_server', function () {
    var done = this.async();

    request.get('http://localhost:5601/config', function (err, resp, body) {
      // err is a failed response, no server is running
      if (err) {
        // run mri_server by default
        var tasks = ['run:mri_server'];
        grunt.config.set('ruby_server', 'mri_server');

        // if jruby flag is set, use jruby
        if (grunt.option('use-jruby'))  {
          tasks = [
            'download_jruby',
            'install_gems',
            'run:jruby_server',
            'wait_for_jruby'
          ];
          grunt.config.set('ruby_server', 'jruby_server');
        }

        grunt.task.run(tasks);

      // response means server is already running
      } else {
        grunt.log.error('Another ruby server is running on localhost:5601.');
      }

      done();
    });
  });
};
