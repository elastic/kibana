module.exports = function (grunt) {
  var join = require('path').join;
  var rel = require('path').join.bind(null, grunt.config.get('root'));
  var directory = join(grunt.config.get('root'), 'esvm');
  var dataDir = join(directory, 'data_dir');

  return {
    options: {
      directory: directory,
      version: '1.4.4',
      plugins: [
        'elasticsearch/marvel/latest'
      ],
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
