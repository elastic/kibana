import serverConfig from '../../test/server_config';
module.exports = function (grunt) {
  const resolve = require('path').resolve;
  const directory = resolve(__dirname, '../../esvm');
  const dataDir = resolve(directory, 'data_dir');

  return {
    options: {
      branch: '5.4',
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
          },
          discovery: {
            zen: {
              ping: {
                unicast: {
                  hosts: [ `localhost:${serverConfig.servers.elasticsearch.port}` ]
                }
              }
            }
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
          },
          discovery: {
            zen: {
              ping: {
                unicast: {
                  hosts: [ `localhost:${serverConfig.servers.elasticsearch.port}` ]
                }
              }
            }
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
