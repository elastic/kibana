module.exports = function (grunt) {
  var resolve = require('path').resolve;
  var directory = resolve(__dirname, '../../esvm');
  var dataDir = resolve(directory, 'data_dir');
  var serverConfig = require('../../test/server_config');

  return {
    options: {
      branch: 'master',
      fresh: !grunt.option('esvm-no-fresh'),
      config: {
        http: {
          port: 9200
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
    tribe: {
      options: {
        directory: resolve(directory, 'tribe'),
        config: {
          path: {
            data: dataDir
          }
        },
        nodes: [{
          cluster: { name: 'cluster-01' },
          http: { port: 9201 },
          node: { name: 'node-01', data: true, master: true, max_local_storage_nodes: 3 }
        }, {
          cluster: { name: 'cluster-02' },
          http: { port: 9202 },
          node: { name: 'node-02', data: true, master: true, max_local_storage_nodes: 3 }
        }, {
          cluster: { name: 'tribe-01' },
          http: { port: 9200 },
          node: { name: 'node-03', max_local_storage_nodes: 3 },
          tribe: {
            c1: {
              cluster: {
                name: 'cluster-01'
              }
            },
            c2: {
              cluster: {
                name: 'cluster-02'
              }
            },
            on_conflict: 'prefer_c1'
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
    test: {
      options: {
        directory: resolve(directory, 'test'),
        purge: true,
        config: {
          http: {
            port: serverConfig.servers.elasticsearch.port
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
            port: serverConfig.servers.elasticsearch.port
          },
          cluster: {
            name: 'esvm-ui'
          }
        }
      }
    },
    withPlugins: {
      options: {
        version: '2.1.0',
        directory: resolve(directory, 'withPlugins'),
        plugins: [
          'license',
          'shield',
          'marvel-agent',
          'watcher'
        ],
        shield: {
          users: [
            {
              username: 'kibana',
              password: 'notsecure',
              roles: ['kibana4_server']
            },
            {
              username: 'user',
              password: 'notsecure',
              roles: ['kibana4', 'marvel']
            },
            {
              username: 'admin',
              password: 'notsecure',
              roles: ['admin']
            }
          ]
        },
        config: {
          marvel: {
            agent: {
              interval: '60s'
            }
          }
        }
      }
    }
  };
};
