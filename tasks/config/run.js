module.exports = function (grunt) {
  var config = {
    kibana_server: {
      options: {
        wait: false
        // quiet: true
      },
      cmd: 'src/server/bin/kibana'
    }
  };

  return config;

};
