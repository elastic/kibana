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

    tribe: {
      options: {
        directory: esTestConfig.getDirectoryForEsvm('tribe'),
        config: {
          path: {
            data: dataDir
          }
        },
        nodes: [{
          cluster: { name: 'data-01' },
          http: { port: 9201 },
          node: { name: 'node-01', data: true, master: true, max_local_storage_nodes: 5 }
        }, {
          cluster: { name: 'data-02' },
          http: { port: 9202 },
          node: { name: 'node-02', data: true, master: true, max_local_storage_nodes: 5 }
        }, {
          cluster: { name: 'admin' },
          http: { port: 9200 },
          node: { name: 'node-03', data: true, master: true, max_local_storage_nodes: 5 }
        }, {
          cluster: { name: 'tribe' },
          http: { port: 9203 },
          node: { name: 'node-04', max_local_storage_nodes: 5 },
          tribe: {
            c1: {
              cluster: {
                name: 'data-01'
              }
            },
            c2: {
              cluster: {
                name: 'data-02'
              }
            },
            on_conflict: 'prefer_c1',
            blocks: {
              write: true
            }
          },
          discovery: {
            zen: {
              ping: {
                unicast: {
                  hosts: [ 'localhost:9201', 'localhost:9202' ]
                }
              }
            }
          }
        }]
      },
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
