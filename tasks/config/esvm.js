module.exports = function (grunt) {
  var resolve = require('path').resolve;
  var directory = resolve(__dirname, '../../esvm');
  var dataDir = resolve(directory, 'data_dir');
  var uiConfig = require('requirefrom')('test')('serverConfig');

  return {
    options: {
      branch: '2.1',
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
          },
          cluster: {
            name: 'esvm-dev'
          }
        }
      }
    },
    test: {
      options: {
        directory: resolve(directory, 'test'),
        purge: true,
        config: {
          http: {
            port: 9210
          },
          cluster: {
            name: 'esvm-test'
          }
        }
      }
    },
    ui: {
      options: {
        directory: resolve(directory, 'test'),
        purge: true,
        config: {
          http: {
            port: uiConfig.servers.elasticsearch.port
          },
          cluster: {
            name: 'esvm-ui'
          }
        }
      }
    }
  };
};
