module.exports = function (grunt) {
  var jrubyPath = grunt.config.get('jrubyPath');
  var jruby = jrubyPath + '/bin/jruby';
  var cmd =  grunt.config.get('src') + '/server/bin/initialize';

  var config = {
    mri_server: {
      options: {
        wait: false
        // quiet: true
      },
      cmd: cmd
    },
    jruby_server: {
      options: {
        wait: false
        // quiet: true
      },
      cmd: jruby,
      args: [
        cmd
      ]
    }
  };

  return config;

};
