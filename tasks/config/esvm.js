module.exports = function (grunt) {
  var resolve = require('path').resolve;
  var directory = resolve(__dirname, '../../esvm');
  var dataDir = resolve(directory, 'data_dir');

  return {
    options: {
      branch: '2.0',
      fresh: !grunt.option('esvm-no-fresh'),
      config: {
        network: {
          host: '127.0.0.1'
        },
        http: {
          port: 9200
        },
        marvel: {
          agent: {
            enabled: false
          }
        }
      }
    },
    dev: {
      options: {
        directory: resolve(directory, 'dev'),
        config: {
          path: {
            data: dataDir
          }
        }
      }
    },
    test: {
      options: {
        directory: resolve(directory, 'test'),
        purge: true
      }
    }
  };
};
