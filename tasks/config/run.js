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

  var args = ['-H', '127.0.0.1'];

  var config = {
    mri_server: {
      options: options,
      cmd: cmd,
      args: args
    },
    jruby_server: {
      options: options,
      cmd: jruby,
      args: [cmd].concat(args)
    },
    built_kibana: {
      options: {
        wait: false,
        ready: /kibana server started/i,
        quiet: true,
        failOnError: false
      },
      cmd: './target/<%= pkg.name + "-" + pkg.version %>/bin/kibana',
      args: args
    }
  };

  return config;
};
