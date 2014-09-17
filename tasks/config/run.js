module.exports = function (grunt) {
  var jrubyPath = grunt.config.get('jrubyPath');
  var jruby = jrubyPath + '/bin/jruby';
  var cmd =  grunt.config.get('src') + '/server/bin/initialize';

  // config:
  // wait: should task wait until the script exits before finishing
  // ready: if not waiting, then how do we know the process is ready?
  // quiet: ignore stdout from the process
  // failOnError: the process is killed if output to stderr

  var options = {
    wait: false,
    ready: /kibana server started/i,
    quiet: true,
    failOnError: true
  };

  var config = {
    mri_server: {
      options: options,
      cmd: cmd
    },
    jruby_server: {
      options: options,
      cmd: jruby,
      args: [
        cmd
      ]
    }
  };

  return config;
};
