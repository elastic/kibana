module.exports = function (grunt) {
  var resolve = require('path').resolve;
  var directory = resolve(__dirname, '../../esvm');
  var dataDir = resolve(directory, 'data_dir');

  return {
    options: {
      directory: directory,
      branch: '2.0',
      fresh: !grunt.option('esvm-no-fresh'),
      config: {
        path: {
          data: dataDir
        },
        network: {
          host: '127.0.0.1'
        },
        marvel: {
          agent: {
            enabled: false
          }
        }
      }
    },
    dev: {}
  };
};
