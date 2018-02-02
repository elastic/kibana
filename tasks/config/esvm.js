import { esTestConfig } from '../../src/test_utils/es';

module.exports = function (grunt) {
  const branch = esTestConfig.getBranch();
  const dataDir = esTestConfig.getDirectoryForEsvm('data_dir');

  return {
    options: {
      branch,
      fresh: !grunt.option('esvm-no-fresh'),
      config: {
        http: {
          port: 9200
        },
      }
    },

    dev: {
      options: {
        directory: esTestConfig.getDirectoryForEsvm('dev'),
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

    ui: {
      options: {
        directory: esTestConfig.getDirectoryForEsvm('test'),
        purge: true,
        config: {
          http: {
            port: esTestConfig.getPort()
          },
          cluster: {
            name: 'esvm-ui'
          },
          discovery: {
            zen: {
              ping: {
                unicast: {
                  hosts: [ `localhost:${esTestConfig.getPort()}` ]
                }
              }
            }
          }
        }
      }
    },

  };
};
