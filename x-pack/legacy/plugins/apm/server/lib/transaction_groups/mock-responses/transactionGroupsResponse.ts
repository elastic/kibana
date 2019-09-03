/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse } from '../fetcher';

export const transactionGroupsResponse = ({
  took: 139,
  timed_out: false,
  _shards: { total: 44, successful: 44, skipped: 0, failed: 0 },
  hits: { total: 131557, max_score: null, hits: [] },
  aggregations: {
    transactions: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'POST /api/orders',
          doc_count: 180,
          avg: { value: 255966.30555555556 },
          p95: { values: { '95.0': 320238.5 } },
          sum: { value: 46073935 },
          sample: {
            hits: {
              total: 180,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: 'TBGQKGcBVMxP8Wrugd8L',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:43:32.010Z',
                    context: {
                      request: {
                        http_version: '1.1',
                        method: 'POST',
                        url: {
                          port: '3000',
                          pathname: '/api/orders',
                          full: 'http://opbeans-node:3000/api/orders',
                          raw: '/api/orders',
                          protocol: 'http:',
                          hostname: 'opbeans-node'
                        },
                        socket: {
                          encrypted: false,
                          remote_address: '::ffff:172.18.0.10'
                        },
                        headers: {
                          host: 'opbeans-node:3000',
                          accept: 'application/json',
                          'content-type': 'application/json',
                          'content-length': '129',
                          connection: 'close',
                          'user-agent': 'workload/2.4.3'
                        },
                        body: '[REDACTED]'
                      },
                      response: {
                        status_code: 200,
                        headers: {
                          date: 'Sun, 18 Nov 2018 20:43:32 GMT',
                          connection: 'close',
                          'x-powered-by': 'Express',
                          'content-type': 'application/json; charset=utf-8',
                          'content-length': '13',
                          etag: 'W/"d-g9K2iK4ordyN88lGL4LmPlYNfhc"'
                        }
                      },
                      system: {
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux'
                      },
                      process: {
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 2413,
                        ppid: 1,
                        title: 'node /app/server.js'
                      },
                      service: {
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node',
                        agent: { name: 'nodejs', version: '1.14.2' },
                        version: '1.0.0',
                        language: { name: 'javascript' }
                      },
                      user: {
                        id: '42',
                        username: 'kimchy',
                        email: 'kimchy@elastic.co'
                      },
                      tags: {
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz',
                        foo: 'bar'
                      },
                      custom: { containerId: 4669 }
                    },
                    trace: { id: '2b1252a338249daeecf6afb0c236e31b' },
                    timestamp: { us: 1542573812010006 },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      sampled: true,
                      span_count: { started: 16 },
                      id: '2c9f39e9ec4a0111',
                      name: 'POST /api/orders',
                      duration: { us: 291572 },
                      type: 'request',
                      result: 'HTTP 2xx'
                    }
                  },
                  sort: [1542573812010]
                }
              ]
            }
          }
        },
        {
          key: 'GET /api',
          doc_count: 21911,
          avg: { value: 48021.972616494 },
          p95: { values: { '95.0': 67138.18364917398 } },
          sum: { value: 1052209442 },
          sample: {
            hits: {
              total: 21911,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: '_hKZKGcBVMxP8Wru1G13',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:53:44.070Z',
                    timestamp: { us: 1542574424070007 },
                    agent: {
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1',
                      type: 'apm-server'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      sampled: true,
                      span_count: { started: 1 },
                      id: 'a78bca581dcd8ff8',
                      name: 'GET /api',
                      duration: { us: 8684 },
                      type: 'request',
                      result: 'HTTP 4xx'
                    },
                    context: {
                      response: {
                        status_code: 404,
                        headers: {
                          'content-type': 'application/json;charset=UTF-8',
                          'transfer-encoding': 'chunked',
                          date: 'Sun, 18 Nov 2018 20:53:43 GMT',
                          connection: 'close',
                          'x-powered-by': 'Express'
                        }
                      },
                      system: {
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux',
                        ip: '172.18.0.10'
                      },
                      process: {
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 3756,
                        ppid: 1,
                        title: 'node /app/server.js'
                      },
                      service: {
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node',
                        agent: { version: '1.14.2', name: 'nodejs' },
                        version: '1.0.0',
                        language: { name: 'javascript' }
                      },
                      user: {
                        id: '42',
                        username: 'kimchy',
                        email: 'kimchy@elastic.co'
                      },
                      tags: {
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz'
                      },
                      custom: { containerId: 5176 },
                      request: {
                        method: 'GET',
                        url: {
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000',
                          pathname: '/api/types/3',
                          full: 'http://opbeans-node:3000/api/types/3',
                          raw: '/api/types/3'
                        },
                        socket: {
                          encrypted: false,
                          remote_address: '::ffff:172.18.0.6'
                        },
                        headers: {
                          'accept-encoding': 'gzip, deflate',
                          accept: '*/*',
                          connection: 'keep-alive',
                          'elastic-apm-traceparent':
                            '00-86c68779d8a65b06fb78e770ffc436a5-4aaea53dc1791183-01',
                          host: 'opbeans-node:3000',
                          'user-agent': 'python-requests/2.20.0'
                        },
                        http_version: '1.1'
                      }
                    },
                    parent: { id: '4aaea53dc1791183' },
                    trace: { id: '86c68779d8a65b06fb78e770ffc436a5' }
                  },
                  sort: [1542574424070]
                }
              ]
            }
          }
        },
        {
          key: 'GET /api/orders',
          doc_count: 3247,
          avg: { value: 33265.03326147213 },
          p95: { values: { '95.0': 58827.489999999976 } },
          sum: { value: 108011563 },
          sample: {
            hits: {
              total: 3247,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: '6BKZKGcBVMxP8Wru1G13',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:53:40.973Z',
                    timestamp: { us: 1542574420973006 },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      type: 'request',
                      result: 'HTTP 2xx',
                      sampled: true,
                      span_count: { started: 2 },
                      id: '89f200353eb50539',
                      name: 'GET /api/orders',
                      duration: { us: 23040 }
                    },
                    context: {
                      user: {
                        username: 'kimchy',
                        email: 'kimchy@elastic.co',
                        id: '42'
                      },
                      tags: {
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz'
                      },
                      custom: { containerId: 408 },
                      request: {
                        method: 'GET',
                        url: {
                          full: 'http://opbeans-node:3000/api/orders',
                          raw: '/api/orders',
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000',
                          pathname: '/api/orders'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.10',
                          encrypted: false
                        },
                        headers: {
                          'user-agent': 'workload/2.4.3',
                          host: 'opbeans-node:3000',
                          connection: 'close'
                        },
                        http_version: '1.1'
                      },
                      response: {
                        status_code: 200,
                        headers: {
                          etag: 'W/"194bc-cOw6+iRf7XCeqMXHrle3IOig7tY"',
                          date: 'Sun, 18 Nov 2018 20:53:40 GMT',
                          connection: 'close',
                          'x-powered-by': 'Express',
                          'content-type': 'application/json; charset=utf-8',
                          'content-length': '103612'
                        }
                      },
                      system: {
                        platform: 'linux',
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64'
                      },
                      process: {
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 3756,
                        ppid: 1
                      },
                      service: {
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node',
                        agent: { version: '1.14.2', name: 'nodejs' }
                      }
                    },
                    trace: { id: '0afce85f593cbbdd09949936fe964f0f' }
                  },
                  sort: [1542574420973]
                }
              ]
            }
          }
        },
        {
          key: 'GET /log-message',
          doc_count: 700,
          avg: { value: 32900.72714285714 },
          p95: { values: { '95.0': 40444 } },
          sum: { value: 23030509 },
          sample: {
            hits: {
              total: 700,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: 'qBKVKGcBVMxP8Wruqi_j',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:49:09.225Z',
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      sampled: true,
                      span_count: { started: 0 },
                      id: 'b9a8f96d7554d09f',
                      name: 'GET /log-message',
                      duration: { us: 32381 },
                      type: 'request',
                      result: 'HTTP 5xx'
                    },
                    context: {
                      user: {
                        id: '42',
                        username: 'kimchy',
                        email: 'kimchy@elastic.co'
                      },
                      tags: {
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz',
                        foo: 'bar'
                      },
                      custom: { containerId: 321 },
                      request: {
                        socket: {
                          remote_address: '::ffff:172.18.0.10',
                          encrypted: false
                        },
                        headers: {
                          'user-agent': 'workload/2.4.3',
                          host: 'opbeans-node:3000',
                          connection: 'close'
                        },
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          raw: '/log-message',
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000',
                          pathname: '/log-message',
                          full: 'http://opbeans-node:3000/log-message'
                        }
                      },
                      response: {
                        status_code: 500,
                        headers: {
                          'x-powered-by': 'Express',
                          'content-type': 'text/html; charset=utf-8',
                          'content-length': '24',
                          etag: 'W/"18-MS3VbhH7auHMzO0fUuNF6v14N/M"',
                          date: 'Sun, 18 Nov 2018 20:49:09 GMT',
                          connection: 'close'
                        }
                      },
                      system: {
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux'
                      },
                      process: {
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 3142,
                        ppid: 1
                      },
                      service: {
                        language: { name: 'javascript' },
                        runtime: { version: '8.12.0', name: 'node' },
                        name: 'opbeans-node',
                        agent: { name: 'nodejs', version: '1.14.2' },
                        version: '1.0.0'
                      }
                    },
                    trace: { id: 'ba18b741cdd3ac83eca89a5fede47577' },
                    timestamp: { us: 1542574149225004 },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' }
                  },
                  sort: [1542574149225]
                }
              ]
            }
          }
        },
        {
          key: 'GET /api/stats',
          doc_count: 4639,
          avg: { value: 32554.36257814184 },
          p95: { values: { '95.0': 59356.73611111111 } },
          sum: { value: 151019688 },
          sample: {
            hits: {
              total: 4639,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: '9hKZKGcBVMxP8Wru1G13',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:53:42.560Z',
                    trace: { id: '63ccc3b0929dafb7f2fbcabdc7f7af25' },
                    timestamp: { us: 1542574422560002 },
                    agent: {
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1',
                      type: 'apm-server'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      sampled: true,
                      span_count: { started: 7 },
                      id: 'fb754e7628da2fb5',
                      name: 'GET /api/stats',
                      duration: { us: 28753 },
                      type: 'request',
                      result: 'HTTP 3xx'
                    },
                    context: {
                      response: {
                        headers: {
                          'x-powered-by': 'Express',
                          etag: 'W/"77-uxKJrX5GSMJJWTKh3orUFAEVxSs"',
                          date: 'Sun, 18 Nov 2018 20:53:42 GMT',
                          connection: 'keep-alive'
                        },
                        status_code: 304
                      },
                      system: {
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux'
                      },
                      process: {
                        pid: 3756,
                        ppid: 1,
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ]
                      },
                      service: {
                        name: 'opbeans-node',
                        agent: { version: '1.14.2', name: 'nodejs' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' }
                      },
                      user: {
                        email: 'kimchy@elastic.co',
                        id: '42',
                        username: 'kimchy'
                      },
                      tags: {
                        'multi-line': 'foo\nbar\nbaz',
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test'
                      },
                      custom: { containerId: 207 },
                      request: {
                        url: {
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000',
                          pathname: '/api/stats',
                          full: 'http://opbeans-node:3000/api/stats',
                          raw: '/api/stats'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.7',
                          encrypted: false
                        },
                        headers: {
                          'if-none-match': 'W/"77-uxKJrX5GSMJJWTKh3orUFAEVxSs"',
                          host: 'opbeans-node:3000',
                          connection: 'keep-alive',
                          'user-agent': 'Chromeless 1.4.0',
                          'elastic-apm-traceparent':
                            '00-63ccc3b0929dafb7f2fbcabdc7f7af25-821a787e73ab1563-01',
                          accept: '*/*',
                          referer: 'http://opbeans-node:3000/dashboard',
                          'accept-encoding': 'gzip, deflate'
                        },
                        http_version: '1.1',
                        method: 'GET'
                      }
                    },
                    parent: { id: '821a787e73ab1563' }
                  },
                  sort: [1542574422560]
                }
              ]
            }
          }
        },
        {
          key: 'GET /log-error',
          doc_count: 736,
          avg: { value: 32387.73641304348 },
          p95: { values: { '95.0': 40061.1 } },
          sum: { value: 23837374 },
          sample: {
            hits: {
              total: 736,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: 'rBKYKGcBVMxP8Wru9mC0',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:52:51.462Z',
                    host: { name: 'b359e3afece8' },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      sampled: true,
                      span_count: { started: 0 },
                      id: 'ec9c465c5042ded8',
                      name: 'GET /log-error',
                      duration: { us: 33367 },
                      type: 'request',
                      result: 'HTTP 5xx'
                    },
                    context: {
                      service: {
                        name: 'opbeans-node',
                        agent: { version: '1.14.2', name: 'nodejs' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' }
                      },
                      user: {
                        id: '42',
                        username: 'kimchy',
                        email: 'kimchy@elastic.co'
                      },
                      tags: {
                        'multi-line': 'foo\nbar\nbaz',
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test'
                      },
                      custom: { containerId: 4877 },
                      request: {
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          full: 'http://opbeans-node:3000/log-error',
                          raw: '/log-error',
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000',
                          pathname: '/log-error'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.10',
                          encrypted: false
                        },
                        headers: {
                          'user-agent': 'workload/2.4.3',
                          host: 'opbeans-node:3000',
                          connection: 'close'
                        }
                      },
                      response: {
                        headers: {
                          date: 'Sun, 18 Nov 2018 20:52:51 GMT',
                          connection: 'close',
                          'x-powered-by': 'Express',
                          'content-type': 'text/html; charset=utf-8',
                          'content-length': '24',
                          etag: 'W/"18-MS3VbhH7auHMzO0fUuNF6v14N/M"'
                        },
                        status_code: 500
                      },
                      system: {
                        architecture: 'x64',
                        platform: 'linux',
                        ip: '172.18.0.10',
                        hostname: '98195610c255'
                      },
                      process: {
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 3659,
                        ppid: 1,
                        title: 'node /app/server.js'
                      }
                    },
                    trace: { id: '15366d65659b5fc8f67ff127391b3aff' },
                    timestamp: { us: 1542574371462005 }
                  },
                  sort: [1542574371462]
                }
              ]
            }
          }
        },
        {
          key: 'GET /api/customers',
          doc_count: 3366,
          avg: { value: 32159.926322043968 },
          p95: { values: { '95.0': 59845.85714285714 } },
          sum: { value: 108250312 },
          sample: {
            hits: {
              total: 3366,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: 'aRKZKGcBVMxP8Wruf2ly',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:53:21.180Z',
                    transaction: {
                      sampled: true,
                      span_count: { started: 2 },
                      id: '94852b9dd1075982',
                      name: 'GET /api/customers',
                      duration: { us: 18077 },
                      type: 'request',
                      result: 'HTTP 2xx'
                    },
                    context: {
                      user: {
                        id: '42',
                        username: 'kimchy',
                        email: 'kimchy@elastic.co'
                      },
                      tags: {
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz'
                      },
                      custom: { containerId: 2531 },
                      request: {
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000',
                          pathname: '/api/customers',
                          full: 'http://opbeans-node:3000/api/customers',
                          raw: '/api/customers'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.6',
                          encrypted: false
                        },
                        headers: {
                          accept: '*/*',
                          connection: 'keep-alive',
                          'elastic-apm-traceparent':
                            '00-541025da8ecc2f51f21c1a4ad6992b77-ca18d9d4c3879519-01',
                          host: 'opbeans-node:3000',
                          'user-agent': 'python-requests/2.20.0',
                          'accept-encoding': 'gzip, deflate'
                        }
                      },
                      response: {
                        status_code: 200,
                        headers: {
                          etag: 'W/"2d991-yG3J8W/roH7fSxXTudZrO27Ax9s"',
                          date: 'Sun, 18 Nov 2018 20:53:21 GMT',
                          connection: 'keep-alive',
                          'x-powered-by': 'Express',
                          'content-type': 'application/json; charset=utf-8',
                          'content-length': '186769'
                        }
                      },
                      system: {
                        platform: 'linux',
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64'
                      },
                      process: {
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 3710,
                        ppid: 1
                      },
                      service: {
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node',
                        agent: { version: '1.14.2', name: 'nodejs' }
                      }
                    },
                    parent: { id: 'ca18d9d4c3879519' },
                    trace: { id: '541025da8ecc2f51f21c1a4ad6992b77' },
                    timestamp: { us: 1542574401180002 },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    }
                  },
                  sort: [1542574401180]
                }
              ]
            }
          }
        },
        {
          key: 'GET /api/products/top',
          doc_count: 3694,
          avg: { value: 27516.89144558744 },
          p95: { values: { '95.0': 56064.679999999986 } },
          sum: { value: 101647397 },
          sample: {
            hits: {
              total: 3694,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: 'LhKZKGcBVMxP8WruHWMl',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:52:57.316Z',
                    host: { name: 'b359e3afece8' },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      span_count: { started: 4 },
                      id: 'be4bd5475d5d9e6f',
                      name: 'GET /api/products/top',
                      duration: { us: 48781 },
                      type: 'request',
                      result: 'HTTP 2xx',
                      sampled: true
                    },
                    context: {
                      request: {
                        headers: {
                          host: 'opbeans-node:3000',
                          connection: 'keep-alive',
                          'user-agent': 'Chromeless 1.4.0',
                          'elastic-apm-traceparent':
                            '00-74f12e705936d66350f4741ebeb55189-fcebe94cd2136215-01',
                          accept: '*/*',
                          referer: 'http://opbeans-node:3000/dashboard',
                          'accept-encoding': 'gzip, deflate'
                        },
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          port: '3000',
                          pathname: '/api/products/top',
                          full: 'http://opbeans-node:3000/api/products/top',
                          raw: '/api/products/top',
                          protocol: 'http:',
                          hostname: 'opbeans-node'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.7',
                          encrypted: false
                        }
                      },
                      response: {
                        status_code: 200,
                        headers: {
                          'x-powered-by': 'Express',
                          'content-type': 'application/json; charset=utf-8',
                          'content-length': '282',
                          etag: 'W/"11a-lcI9zuMZYYsDRpEZgYqDYr96cKM"',
                          date: 'Sun, 18 Nov 2018 20:52:57 GMT',
                          connection: 'keep-alive'
                        }
                      },
                      system: {
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux',
                        ip: '172.18.0.10'
                      },
                      process: {
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 3686,
                        ppid: 1
                      },
                      service: {
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node',
                        agent: { name: 'nodejs', version: '1.14.2' }
                      },
                      user: {
                        username: 'kimchy',
                        email: 'kimchy@elastic.co',
                        id: '42'
                      },
                      tags: {
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz'
                      },
                      custom: { containerId: 5113 }
                    },
                    parent: { id: 'fcebe94cd2136215' },
                    trace: { id: '74f12e705936d66350f4741ebeb55189' },
                    timestamp: { us: 1542574377316005 }
                  },
                  sort: [1542574377316]
                }
              ]
            }
          }
        },
        {
          key: 'POST /api',
          doc_count: 147,
          avg: { value: 21331.714285714286 },
          p95: { values: { '95.0': 30938 } },
          sum: { value: 3135762 },
          sample: {
            hits: {
              total: 147,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: 'DhGDKGcBVMxP8WruzRXV',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:29:42.751Z',
                    transaction: {
                      duration: { us: 21083 },
                      type: 'request',
                      result: 'HTTP 4xx',
                      sampled: true,
                      span_count: { started: 1 },
                      id: 'd67c2f7aa897110c',
                      name: 'POST /api'
                    },
                    context: {
                      user: {
                        email: 'kimchy@elastic.co',
                        id: '42',
                        username: 'kimchy'
                      },
                      tags: {
                        'multi-line': 'foo\nbar\nbaz',
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test'
                      },
                      custom: { containerId: 2927 },
                      request: {
                        url: {
                          raw: '/api/orders',
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000',
                          pathname: '/api/orders',
                          full: 'http://opbeans-node:3000/api/orders'
                        },
                        socket: {
                          encrypted: false,
                          remote_address: '::ffff:172.18.0.10'
                        },
                        headers: {
                          accept: 'application/json',
                          'content-type': 'application/json',
                          'content-length': '129',
                          connection: 'close',
                          'user-agent': 'workload/2.4.3',
                          host: 'opbeans-node:3000'
                        },
                        body: '[REDACTED]',
                        http_version: '1.1',
                        method: 'POST'
                      },
                      response: {
                        status_code: 400,
                        headers: {
                          'x-powered-by': 'Express',
                          date: 'Sun, 18 Nov 2018 20:29:42 GMT',
                          'content-length': '0',
                          connection: 'close'
                        }
                      },
                      system: {
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux',
                        ip: '172.18.0.10'
                      },
                      process: {
                        pid: 546,
                        ppid: 1,
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ]
                      },
                      service: {
                        agent: { name: 'nodejs', version: '1.14.2' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node'
                      }
                    },
                    trace: { id: '8ed4d94ec8fc11b1ea1b0aa59c2320ff' },
                    timestamp: { us: 1542572982751005 },
                    agent: {
                      version: '7.0.0-alpha1',
                      type: 'apm-server',
                      hostname: 'b359e3afece8'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    }
                  },
                  sort: [1542572982751]
                }
              ]
            }
          }
        },
        {
          key: 'GET /api/products/:id/customers',
          doc_count: 2102,
          avg: { value: 17189.329210275926 },
          p95: { values: { '95.0': 39284.79999999999 } },
          sum: { value: 36131970 },
          sample: {
            hits: {
              total: 2102,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: 'lhKVKGcBVMxP8WruDCUH',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:48:24.769Z',
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      event: 'transaction',
                      name: 'transaction'
                    },
                    transaction: {
                      type: 'request',
                      result: 'HTTP 2xx',
                      sampled: true,
                      span_count: { started: 1 },
                      id: '2a87ae20ad04ee0c',
                      name: 'GET /api/products/:id/customers',
                      duration: { us: 49338 }
                    },
                    context: {
                      user: {
                        id: '42',
                        username: 'kimchy',
                        email: 'kimchy@elastic.co'
                      },
                      tags: {
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz',
                        foo: 'bar'
                      },
                      custom: { containerId: 1735 },
                      request: {
                        headers: {
                          accept: '*/*',
                          connection: 'keep-alive',
                          'elastic-apm-traceparent':
                            '00-28f178c354d17f400dea04bc4a7b3c57-68f5d1607cac7779-01',
                          host: 'opbeans-node:3000',
                          'user-agent': 'python-requests/2.20.0',
                          'accept-encoding': 'gzip, deflate'
                        },
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          port: '3000',
                          pathname: '/api/products/2/customers',
                          full:
                            'http://opbeans-node:3000/api/products/2/customers',
                          raw: '/api/products/2/customers',
                          protocol: 'http:',
                          hostname: 'opbeans-node'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.6',
                          encrypted: false
                        }
                      },
                      response: {
                        status_code: 200,
                        headers: {
                          'content-length': '186570',
                          etag: 'W/"2d8ca-Z9NzuHyGyxwtzpOkcIxBvzm24iw"',
                          date: 'Sun, 18 Nov 2018 20:48:24 GMT',
                          connection: 'keep-alive',
                          'x-powered-by': 'Express',
                          'content-type': 'application/json; charset=utf-8'
                        }
                      },
                      system: {
                        platform: 'linux',
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64'
                      },
                      process: {
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 3100,
                        ppid: 1,
                        title: 'node /app/server.js'
                      },
                      service: {
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node',
                        agent: { version: '1.14.2', name: 'nodejs' },
                        version: '1.0.0'
                      }
                    },
                    parent: { id: '68f5d1607cac7779' },
                    trace: { id: '28f178c354d17f400dea04bc4a7b3c57' },
                    timestamp: { us: 1542574104769029 }
                  },
                  sort: [1542574104769]
                }
              ]
            }
          }
        },
        {
          key: 'GET /api/types/:id',
          doc_count: 1449,
          avg: { value: 12763.68806073154 },
          p95: { values: { '95.0': 30576.749999999996 } },
          sum: { value: 18494584 },
          sample: {
            hits: {
              total: 1449,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: 'lxKZKGcBVMxP8WrurGuW',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:53:35.967Z',
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      id: '053436abacdec0a4',
                      name: 'GET /api/types/:id',
                      duration: { us: 13064 },
                      type: 'request',
                      result: 'HTTP 2xx',
                      sampled: true,
                      span_count: { started: 2 }
                    },
                    context: {
                      process: {
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 3756,
                        ppid: 1
                      },
                      service: {
                        name: 'opbeans-node',
                        agent: { name: 'nodejs', version: '1.14.2' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' }
                      },
                      user: {
                        id: '42',
                        username: 'kimchy',
                        email: 'kimchy@elastic.co'
                      },
                      tags: {
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz'
                      },
                      custom: { containerId: 5345 },
                      request: {
                        socket: {
                          remote_address: '::ffff:172.18.0.10',
                          encrypted: false
                        },
                        headers: {
                          'user-agent': 'workload/2.4.3',
                          host: 'opbeans-node:3000',
                          connection: 'close'
                        },
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          pathname: '/api/types/1',
                          full: 'http://opbeans-node:3000/api/types/1',
                          raw: '/api/types/1',
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000'
                        }
                      },
                      response: {
                        status_code: 200,
                        headers: {
                          'x-powered-by': 'Express',
                          'content-type': 'application/json; charset=utf-8',
                          'content-length': '217',
                          etag: 'W/"d9-cebOOHODBQMZd1wt+ZZBaSPgQLQ"',
                          date: 'Sun, 18 Nov 2018 20:53:35 GMT',
                          connection: 'close'
                        }
                      },
                      system: {
                        platform: 'linux',
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64'
                      }
                    },
                    trace: { id: '2223b30b5cbaf2e221fcf70ac6d9abbe' },
                    timestamp: { us: 1542574415967005 },
                    host: { name: 'b359e3afece8' },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    }
                  },
                  sort: [1542574415967]
                }
              ]
            }
          }
        },
        {
          key: 'GET /api/products',
          doc_count: 3678,
          avg: { value: 12683.190864600327 },
          p95: { values: { '95.0': 35009.67999999999 } },
          sum: { value: 46648776 },
          sample: {
            hits: {
              total: 3678,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: '-hKZKGcBVMxP8Wru1G13',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:53:43.477Z',
                    trace: { id: 'bee00a8efb523ca4b72adad57f7caba3' },
                    timestamp: { us: 1542574423477006 },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      span_count: { started: 2 },
                      id: 'd8fc6d3b8707b64c',
                      name: 'GET /api/products',
                      duration: { us: 6915 },
                      type: 'request',
                      result: 'HTTP 2xx',
                      sampled: true
                    },
                    context: {
                      custom: { containerId: 2857 },
                      request: {
                        headers: {
                          'user-agent': 'workload/2.4.3',
                          host: 'opbeans-node:3000',
                          connection: 'close'
                        },
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          full: 'http://opbeans-node:3000/api/products',
                          raw: '/api/products',
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000',
                          pathname: '/api/products'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.10',
                          encrypted: false
                        }
                      },
                      response: {
                        status_code: 200,
                        headers: {
                          connection: 'close',
                          'x-powered-by': 'Express',
                          'content-type': 'application/json; charset=utf-8',
                          'content-length': '1023',
                          etag: 'W/"3ff-VyOxcDApb+a/lnjkm9FeTOGSDrs"',
                          date: 'Sun, 18 Nov 2018 20:53:43 GMT'
                        }
                      },
                      system: {
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux',
                        ip: '172.18.0.10'
                      },
                      process: {
                        pid: 3756,
                        ppid: 1,
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ]
                      },
                      service: {
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node',
                        agent: { version: '1.14.2', name: 'nodejs' },
                        version: '1.0.0',
                        language: { name: 'javascript' }
                      },
                      user: {
                        id: '42',
                        username: 'kimchy',
                        email: 'kimchy@elastic.co'
                      },
                      tags: {
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz'
                      }
                    }
                  },
                  sort: [1542574423477]
                }
              ]
            }
          }
        },
        {
          key: 'GET /api/types',
          doc_count: 2400,
          avg: { value: 11257.757916666667 },
          p95: { values: { '95.0': 35222.944444444445 } },
          sum: { value: 27018619 },
          sample: {
            hits: {
              total: 2400,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: '_xKZKGcBVMxP8Wru1G13',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:53:44.978Z',
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      id: '0f10668e4fb3adc7',
                      name: 'GET /api/types',
                      duration: { us: 7891 },
                      type: 'request',
                      result: 'HTTP 2xx',
                      sampled: true,
                      span_count: { started: 2 }
                    },
                    context: {
                      request: {
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          hostname: 'opbeans-node',
                          port: '3000',
                          pathname: '/api/types',
                          full: 'http://opbeans-node:3000/api/types',
                          raw: '/api/types',
                          protocol: 'http:'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.10',
                          encrypted: false
                        },
                        headers: {
                          connection: 'close',
                          'user-agent': 'workload/2.4.3',
                          host: 'opbeans-node:3000'
                        }
                      },
                      response: {
                        status_code: 200,
                        headers: {
                          'content-length': '112',
                          etag: 'W/"70-1z6hT7P1WHgBgS/BeUEVeHhOCQU"',
                          date: 'Sun, 18 Nov 2018 20:53:44 GMT',
                          connection: 'close',
                          'x-powered-by': 'Express',
                          'content-type': 'application/json; charset=utf-8'
                        }
                      },
                      system: {
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux',
                        ip: '172.18.0.10'
                      },
                      process: {
                        pid: 3756,
                        ppid: 1,
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ]
                      },
                      service: {
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node',
                        agent: { version: '1.14.2', name: 'nodejs' }
                      },
                      user: {
                        email: 'kimchy@elastic.co',
                        id: '42',
                        username: 'kimchy'
                      },
                      tags: {
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz'
                      },
                      custom: { containerId: 2193 }
                    },
                    trace: { id: '0d84126973411c19b470f2d9eea958d3' },
                    timestamp: { us: 1542574424978005 },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' }
                  },
                  sort: [1542574424978]
                }
              ]
            }
          }
        },
        {
          key: 'GET /api/orders/:id',
          doc_count: 1283,
          avg: { value: 10584.05144193297 },
          p95: { values: { '95.0': 26555.399999999998 } },
          sum: { value: 13579338 },
          sample: {
            hits: {
              total: 1283,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: 'SRKXKGcBVMxP8Wru41Gf',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:51:36.949Z',
                    context: {
                      tags: {
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz'
                      },
                      custom: { containerId: 5999 },
                      request: {
                        socket: {
                          remote_address: '::ffff:172.18.0.10',
                          encrypted: false
                        },
                        headers: {
                          connection: 'close',
                          'user-agent': 'workload/2.4.3',
                          host: 'opbeans-node:3000'
                        },
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          raw: '/api/orders/183',
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000',
                          pathname: '/api/orders/183',
                          full: 'http://opbeans-node:3000/api/orders/183'
                        }
                      },
                      response: {
                        headers: {
                          date: 'Sun, 18 Nov 2018 20:51:36 GMT',
                          connection: 'close',
                          'content-length': '0',
                          'x-powered-by': 'Express'
                        },
                        status_code: 404
                      },
                      system: {
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux',
                        ip: '172.18.0.10'
                      },
                      process: {
                        pid: 3475,
                        ppid: 1,
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ]
                      },
                      service: {
                        agent: { name: 'nodejs', version: '1.14.2' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node'
                      },
                      user: {
                        username: 'kimchy',
                        email: 'kimchy@elastic.co',
                        id: '42'
                      }
                    },
                    trace: { id: 'dab6421fa44a6869887e0edf32e1ad6f' },
                    timestamp: { us: 1542574296949004 },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      span_count: { started: 1 },
                      id: '937ef5588454f74a',
                      name: 'GET /api/orders/:id',
                      duration: { us: 5906 },
                      type: 'request',
                      result: 'HTTP 4xx',
                      sampled: true
                    }
                  },
                  sort: [1542574296949]
                }
              ]
            }
          }
        },
        {
          key: 'GET /api/products/:id',
          doc_count: 1839,
          avg: { value: 10548.218597063622 },
          p95: { values: { '95.0': 28413.383333333328 } },
          sum: { value: 19398174 },
          sample: {
            hits: {
              total: 1839,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: 'OxKZKGcBVMxP8WruHWMl',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:52:57.963Z',
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      span_count: { started: 1 },
                      id: 'd324897ffb7ebcdc',
                      name: 'GET /api/products/:id',
                      duration: { us: 6959 },
                      type: 'request',
                      result: 'HTTP 2xx',
                      sampled: true
                    },
                    context: {
                      service: {
                        name: 'opbeans-node',
                        agent: { version: '1.14.2', name: 'nodejs' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { version: '8.12.0', name: 'node' }
                      },
                      user: {
                        email: 'kimchy@elastic.co',
                        id: '42',
                        username: 'kimchy'
                      },
                      tags: {
                        'multi-line': 'foo\nbar\nbaz',
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test'
                      },
                      custom: { containerId: 7184 },
                      request: {
                        socket: {
                          remote_address: '::ffff:172.18.0.10',
                          encrypted: false
                        },
                        headers: {
                          host: 'opbeans-node:3000',
                          connection: 'close',
                          'user-agent': 'workload/2.4.3'
                        },
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          port: '3000',
                          pathname: '/api/products/3',
                          full: 'http://opbeans-node:3000/api/products/3',
                          raw: '/api/products/3',
                          protocol: 'http:',
                          hostname: 'opbeans-node'
                        }
                      },
                      response: {
                        status_code: 200,
                        headers: {
                          'x-powered-by': 'Express',
                          'content-type': 'application/json; charset=utf-8',
                          'content-length': '231',
                          etag: 'W/"e7-kkuzj37GZDzXDh0CWqh5Gan0VO4"',
                          date: 'Sun, 18 Nov 2018 20:52:57 GMT',
                          connection: 'close'
                        }
                      },
                      system: {
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux'
                      },
                      process: {
                        pid: 3686,
                        ppid: 1,
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ]
                      }
                    },
                    trace: { id: 'ca86ec845e412e4b4506a715d51548ec' },
                    timestamp: { us: 1542574377963005 }
                  },
                  sort: [1542574377963]
                }
              ]
            }
          }
        },
        {
          key: 'GET /api/customers/:id',
          doc_count: 1900,
          avg: { value: 9868.217894736843 },
          p95: { values: { '95.0': 27486.5 } },
          sum: { value: 18749614 },
          sample: {
            hits: {
              total: 1900,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: 'IhKZKGcBVMxP8WruHGPb',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:52:56.797Z',
                    agent: {
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1',
                      type: 'apm-server'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      span_count: { started: 1 },
                      id: '60e230d12f3f0960',
                      name: 'GET /api/customers/:id',
                      duration: { us: 9735 },
                      type: 'request',
                      result: 'HTTP 2xx',
                      sampled: true
                    },
                    context: {
                      response: {
                        status_code: 200,
                        headers: {
                          connection: 'keep-alive',
                          'x-powered-by': 'Express',
                          'content-type': 'application/json; charset=utf-8',
                          'content-length': '193',
                          etag: 'W/"c1-LbuhkuLzFyZ0H+7+JQGA5b0kvNs"',
                          date: 'Sun, 18 Nov 2018 20:52:56 GMT'
                        }
                      },
                      system: {
                        architecture: 'x64',
                        platform: 'linux',
                        ip: '172.18.0.10',
                        hostname: '98195610c255'
                      },
                      process: {
                        ppid: 1,
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 3686
                      },
                      service: {
                        name: 'opbeans-node',
                        agent: { name: 'nodejs', version: '1.14.2' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' }
                      },
                      user: {
                        username: 'kimchy',
                        email: 'kimchy@elastic.co',
                        id: '42'
                      },
                      tags: {
                        'multi-line': 'foo\nbar\nbaz',
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test'
                      },
                      custom: { containerId: 8225 },
                      request: {
                        headers: {
                          'accept-encoding': 'gzip, deflate',
                          accept: '*/*',
                          connection: 'keep-alive',
                          'elastic-apm-traceparent':
                            '00-e6140d30363f18b585f5d3b753f4d025-aa82e2c847265626-01',
                          host: 'opbeans-node:3000',
                          'user-agent': 'python-requests/2.20.0'
                        },
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          pathname: '/api/customers/700',
                          full: 'http://opbeans-node:3000/api/customers/700',
                          raw: '/api/customers/700',
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.6',
                          encrypted: false
                        }
                      }
                    },
                    parent: { id: 'aa82e2c847265626' },
                    trace: { id: 'e6140d30363f18b585f5d3b753f4d025' },
                    timestamp: { us: 1542574376797031 }
                  },
                  sort: [1542574376797]
                }
              ]
            }
          }
        },
        {
          key: 'POST unknown route',
          doc_count: 20,
          avg: { value: 5192.9 },
          p95: { values: { '95.0': 13230.5 } },
          sum: { value: 103858 },
          sample: {
            hits: {
              total: 20,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: '4wsiKGcBVMxP8Wru2j59',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T18:43:50.994Z',
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      sampled: true,
                      span_count: { started: 0 },
                      id: '92c3ceea57899061',
                      name: 'POST unknown route',
                      duration: { us: 3467 },
                      type: 'request',
                      result: 'HTTP 4xx'
                    },
                    context: {
                      system: {
                        platform: 'linux',
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64'
                      },
                      process: {
                        pid: 19196,
                        ppid: 1,
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ]
                      },
                      service: {
                        name: 'opbeans-node',
                        agent: { version: '1.14.2', name: 'nodejs' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' }
                      },
                      user: {
                        email: 'kimchy@elastic.co',
                        id: '42',
                        username: 'kimchy'
                      },
                      tags: {
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz',
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.'
                      },
                      custom: { containerId: 6102 },
                      request: {
                        method: 'POST',
                        url: {
                          raw: '/api/orders/csv',
                          protocol: 'http:',
                          hostname: '172.18.0.9',
                          port: '3000',
                          pathname: '/api/orders/csv',
                          full: 'http://172.18.0.9:3000/api/orders/csv'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.9',
                          encrypted: false
                        },
                        headers: {
                          'accept-encoding': 'gzip, deflate',
                          'content-type':
                            'multipart/form-data; boundary=2b2e40be188a4cb5a56c05a0c182f6c9',
                          'elastic-apm-traceparent':
                            '00-19688959ea6cbccda8013c11566ea329-1fc3665eef2dcdfc-01',
                          'x-forwarded-for': '172.18.0.11',
                          host: '172.18.0.9:3000',
                          'user-agent': 'Python/3.7 aiohttp/3.3.2',
                          'content-length': '380',
                          accept: '*/*'
                        },
                        body: '[REDACTED]',
                        http_version: '1.1'
                      },
                      response: {
                        headers: {
                          date: 'Sun, 18 Nov 2018 18:43:50 GMT',
                          connection: 'keep-alive',
                          'x-powered-by': 'Express',
                          'content-security-policy': "default-src 'self'",
                          'x-content-type-options': 'nosniff',
                          'content-type': 'text/html; charset=utf-8',
                          'content-length': '154'
                        },
                        status_code: 404
                      }
                    },
                    parent: { id: '1fc3665eef2dcdfc' },
                    trace: { id: '19688959ea6cbccda8013c11566ea329' },
                    timestamp: { us: 1542566630994005 },
                    agent: {
                      version: '7.0.0-alpha1',
                      type: 'apm-server',
                      hostname: 'b359e3afece8'
                    }
                  },
                  sort: [1542566630994]
                }
              ]
            }
          }
        },
        {
          key: 'GET /is-it-coffee-time',
          doc_count: 358,
          avg: { value: 4694.005586592179 },
          p95: { values: { '95.0': 11022.99999999992 } },
          sum: { value: 1680454 },
          sample: {
            hits: {
              total: 358,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: '7RKSKGcBVMxP8Wru-gjC',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:46:19.317Z',
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      id: '319a5c555a1ab207',
                      name: 'GET /is-it-coffee-time',
                      duration: { us: 4253 },
                      type: 'request',
                      result: 'HTTP 5xx',
                      sampled: true,
                      span_count: { started: 0 }
                    },
                    context: {
                      process: {
                        pid: 2760,
                        ppid: 1,
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ]
                      },
                      service: {
                        agent: { name: 'nodejs', version: '1.14.2' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node'
                      },
                      user: {
                        email: 'kimchy@elastic.co',
                        id: '42',
                        username: 'kimchy'
                      },
                      tags: {
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz'
                      },
                      custom: { containerId: 8593 },
                      request: {
                        headers: {
                          'user-agent': 'workload/2.4.3',
                          host: 'opbeans-node:3000',
                          connection: 'close'
                        },
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          port: '3000',
                          pathname: '/is-it-coffee-time',
                          full: 'http://opbeans-node:3000/is-it-coffee-time',
                          raw: '/is-it-coffee-time',
                          protocol: 'http:',
                          hostname: 'opbeans-node'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.10',
                          encrypted: false
                        }
                      },
                      response: {
                        status_code: 500,
                        headers: {
                          date: 'Sun, 18 Nov 2018 20:46:19 GMT',
                          connection: 'close',
                          'x-powered-by': 'Express',
                          'content-security-policy': "default-src 'self'",
                          'x-content-type-options': 'nosniff',
                          'content-type': 'text/html; charset=utf-8',
                          'content-length': '148'
                        }
                      },
                      system: {
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux'
                      }
                    },
                    trace: { id: '821812b416de4c73ced87f8777fa46a6' },
                    timestamp: { us: 1542573979317007 }
                  },
                  sort: [1542573979317]
                }
              ]
            }
          }
        },
        {
          key: 'GET /throw-error',
          doc_count: 336,
          avg: { value: 4549.889880952381 },
          p95: { values: { '95.0': 7719.700000000001 } },
          sum: { value: 1528763 },
          sample: {
            hits: {
              total: 336,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: 'PhKTKGcBVMxP8WruwxSG',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:47:10.714Z',
                    agent: {
                      version: '7.0.0-alpha1',
                      type: 'apm-server',
                      hostname: 'b359e3afece8'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      id: 'ecd187dc53f09fbd',
                      name: 'GET /throw-error',
                      duration: { us: 4458 },
                      type: 'request',
                      result: 'HTTP 5xx',
                      sampled: true,
                      span_count: { started: 0 }
                    },
                    context: {
                      user: {
                        id: '42',
                        username: 'kimchy',
                        email: 'kimchy@elastic.co'
                      },
                      tags: {
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz',
                        foo: 'bar'
                      },
                      custom: { containerId: 7220 },
                      request: {
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          port: '3000',
                          pathname: '/throw-error',
                          full: 'http://opbeans-node:3000/throw-error',
                          raw: '/throw-error',
                          protocol: 'http:',
                          hostname: 'opbeans-node'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.10',
                          encrypted: false
                        },
                        headers: {
                          'user-agent': 'workload/2.4.3',
                          host: 'opbeans-node:3000',
                          connection: 'close'
                        }
                      },
                      response: {
                        status_code: 500,
                        headers: {
                          'x-content-type-options': 'nosniff',
                          'content-type': 'text/html; charset=utf-8',
                          'content-length': '148',
                          date: 'Sun, 18 Nov 2018 20:47:10 GMT',
                          connection: 'close',
                          'x-powered-by': 'Express',
                          'content-security-policy': "default-src 'self'"
                        }
                      },
                      system: {
                        platform: 'linux',
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64'
                      },
                      process: {
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 2895,
                        ppid: 1
                      },
                      service: {
                        name: 'opbeans-node',
                        agent: { version: '1.14.2', name: 'nodejs' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' }
                      }
                    },
                    trace: { id: '6c0ef23e1f963f304ce440a909914d35' },
                    timestamp: { us: 1542574030714012 }
                  },
                  sort: [1542574030714]
                }
              ]
            }
          }
        },
        {
          key: 'GET *',
          doc_count: 7115,
          avg: { value: 3504.5108924806746 },
          p95: { values: { '95.0': 11431.738095238095 } },
          sum: { value: 24934595 },
          sample: {
            hits: {
              total: 7115,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: '6hKZKGcBVMxP8Wru1G13',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:53:42.493Z',
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      span_count: { started: 0 },
                      id: 'f5fc4621949b63fb',
                      name: 'GET *',
                      duration: { us: 1901 },
                      type: 'request',
                      result: 'HTTP 3xx',
                      sampled: true
                    },
                    context: {
                      request: {
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          hostname: 'opbeans-node',
                          port: '3000',
                          pathname: '/dashboard',
                          full: 'http://opbeans-node:3000/dashboard',
                          raw: '/dashboard',
                          protocol: 'http:'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.7',
                          encrypted: false
                        },
                        headers: {
                          accept:
                            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                          'accept-encoding': 'gzip, deflate',
                          'if-none-match': 'W/"280-1670775e878"',
                          'if-modified-since': 'Mon, 12 Nov 2018 10:27:07 GMT',
                          host: 'opbeans-node:3000',
                          connection: 'keep-alive',
                          'upgrade-insecure-requests': '1',
                          'user-agent': 'Chromeless 1.4.0'
                        }
                      },
                      response: {
                        status_code: 304,
                        headers: {
                          'x-powered-by': 'Express',
                          'accept-ranges': 'bytes',
                          'cache-control': 'public, max-age=0',
                          'last-modified': 'Mon, 12 Nov 2018 10:27:07 GMT',
                          etag: 'W/"280-1670775e878"',
                          date: 'Sun, 18 Nov 2018 20:53:42 GMT',
                          connection: 'keep-alive'
                        }
                      },
                      system: {
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux',
                        ip: '172.18.0.10'
                      },
                      process: {
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 3756,
                        ppid: 1
                      },
                      service: {
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node',
                        agent: { version: '1.14.2', name: 'nodejs' }
                      },
                      user: {
                        email: 'kimchy@elastic.co',
                        id: '42',
                        username: 'kimchy'
                      },
                      tags: {
                        'multi-line': 'foo\nbar\nbaz',
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.',
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test'
                      },
                      custom: { containerId: 6446 }
                    },
                    trace: { id: '7efb6ade88cdea20cd96ca482681cde7' },
                    timestamp: { us: 1542574422493006 }
                  },
                  sort: [1542574422493]
                }
              ]
            }
          }
        },
        {
          key: 'OPTIONS unknown route',
          doc_count: 364,
          avg: { value: 2742.4615384615386 },
          p95: { values: { '95.0': 4370.000000000002 } },
          sum: { value: 998256 },
          sample: {
            hits: {
              total: 364,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: '-xKVKGcBVMxP8WrucSs2',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:49:00.707Z',
                    timestamp: { us: 1542574140707006 },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      span_count: { started: 0 },
                      id: 'a8c87ebc7ec68bc0',
                      name: 'OPTIONS unknown route',
                      duration: { us: 2371 },
                      type: 'request',
                      result: 'HTTP 2xx',
                      sampled: true
                    },
                    context: {
                      user: {
                        id: '42',
                        username: 'kimchy',
                        email: 'kimchy@elastic.co'
                      },
                      tags: {
                        'this-is-a-very-long-tag-name-without-any-spaces':
                          'test',
                        'multi-line': 'foo\nbar\nbaz',
                        foo: 'bar',
                        lorem:
                          'ipsum dolor sit amet, consectetur adipiscing elit. Nulla finibus, ipsum id scelerisque consequat, enim leo vulputate massa, vel ultricies ante neque ac risus. Curabitur tincidunt vitae sapien id pulvinar. Mauris eu vestibulum tortor. Integer sit amet lorem fringilla, egestas tellus vitae, vulputate purus. Nulla feugiat blandit nunc et semper. Morbi purus libero, mattis sed mauris non, euismod iaculis lacus. Curabitur eleifend ante eros, non faucibus velit lacinia id. Duis posuere libero augue, at dignissim urna consectetur eget. Praesent eu congue est, iaculis finibus augue.'
                      },
                      custom: { containerId: 3775 },
                      request: {
                        socket: {
                          remote_address: '::ffff:172.18.0.10',
                          encrypted: false
                        },
                        headers: {
                          'user-agent': 'workload/2.4.3',
                          host: 'opbeans-node:3000',
                          'content-length': '0',
                          connection: 'close'
                        },
                        http_version: '1.1',
                        method: 'OPTIONS',
                        url: {
                          port: '3000',
                          pathname: '/',
                          full: 'http://opbeans-node:3000/',
                          raw: '/',
                          protocol: 'http:',
                          hostname: 'opbeans-node'
                        }
                      },
                      response: {
                        status_code: 200,
                        headers: {
                          'content-type': 'text/html; charset=utf-8',
                          'content-length': '8',
                          etag: 'W/"8-ZRAf8oNBS3Bjb/SU2GYZCmbtmXg"',
                          date: 'Sun, 18 Nov 2018 20:49:00 GMT',
                          connection: 'close',
                          'x-powered-by': 'Express',
                          allow: 'GET,HEAD'
                        }
                      },
                      system: {
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux'
                      },
                      process: {
                        ppid: 1,
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 3142
                      },
                      service: {
                        agent: { name: 'nodejs', version: '1.14.2' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node'
                      }
                    },
                    trace: { id: '469e3e5f91ffe3195a8e58cdd1cdefa8' }
                  },
                  sort: [1542574140707]
                }
              ]
            }
          }
        },
        {
          key: 'GET static file',
          doc_count: 62606,
          avg: { value: 2651.8784461553205 },
          p95: { values: { '95.0': 6140.579335038363 } },
          sum: { value: 166023502 },
          sample: {
            hits: {
              total: 62606,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: '-RKZKGcBVMxP8Wru1G13',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:53:43.304Z',
                    context: {
                      system: {
                        platform: 'linux',
                        ip: '172.18.0.10',
                        hostname: '98195610c255',
                        architecture: 'x64'
                      },
                      process: {
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ],
                        pid: 3756,
                        ppid: 1
                      },
                      service: {
                        name: 'opbeans-node',
                        agent: { name: 'nodejs', version: '1.14.2' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' }
                      },
                      request: {
                        headers: {
                          'user-agent': 'curl/7.38.0',
                          host: 'opbeans-node:3000',
                          accept: '*/*'
                        },
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          pathname: '/',
                          full: 'http://opbeans-node:3000/',
                          raw: '/',
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000'
                        },
                        socket: {
                          encrypted: false,
                          remote_address: '::ffff:172.18.0.10'
                        }
                      },
                      response: {
                        status_code: 200,
                        headers: {
                          'content-length': '640',
                          'accept-ranges': 'bytes',
                          'cache-control': 'public, max-age=0',
                          etag: 'W/"280-1670775e878"',
                          'x-powered-by': 'Express',
                          'last-modified': 'Mon, 12 Nov 2018 10:27:07 GMT',
                          'content-type': 'text/html; charset=UTF-8',
                          date: 'Sun, 18 Nov 2018 20:53:43 GMT',
                          connection: 'keep-alive'
                        }
                      }
                    },
                    trace: { id: 'b303d2a4a007946b63b9db7fafe639a0' },
                    timestamp: { us: 1542574423304006 },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' },
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      span_count: { started: 0 },
                      id: '2869c13633534be5',
                      name: 'GET static file',
                      duration: { us: 1801 },
                      type: 'request',
                      result: 'HTTP 2xx',
                      sampled: true
                    }
                  },
                  sort: [1542574423304]
                }
              ]
            }
          }
        },
        {
          key: 'GET unknown route',
          doc_count: 7487,
          avg: { value: 1422.926672899693 },
          p95: { values: { '95.0': 2311.885238095238 } },
          sum: { value: 10653452 },
          sample: {
            hits: {
              total: 7487,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-2018.11.18',
                  _type: 'doc',
                  _id: '6xKZKGcBVMxP8Wru1G13',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-11-18T20:53:42.504Z',
                    processor: {
                      name: 'transaction',
                      event: 'transaction'
                    },
                    transaction: {
                      name: 'GET unknown route',
                      duration: { us: 911 },
                      type: 'request',
                      result: 'HTTP 2xx',
                      sampled: true,
                      span_count: { started: 0 },
                      id: '107881ae2be1b56d'
                    },
                    context: {
                      system: {
                        hostname: '98195610c255',
                        architecture: 'x64',
                        platform: 'linux',
                        ip: '172.18.0.10'
                      },
                      process: {
                        pid: 3756,
                        ppid: 1,
                        title: 'node /app/server.js',
                        argv: [
                          '/usr/local/bin/node',
                          '/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js'
                        ]
                      },
                      service: {
                        agent: { version: '1.14.2', name: 'nodejs' },
                        version: '1.0.0',
                        language: { name: 'javascript' },
                        runtime: { name: 'node', version: '8.12.0' },
                        name: 'opbeans-node'
                      },
                      request: {
                        http_version: '1.1',
                        method: 'GET',
                        url: {
                          full: 'http://opbeans-node:3000/rum-config.js',
                          raw: '/rum-config.js',
                          protocol: 'http:',
                          hostname: 'opbeans-node',
                          port: '3000',
                          pathname: '/rum-config.js'
                        },
                        socket: {
                          remote_address: '::ffff:172.18.0.7',
                          encrypted: false
                        },
                        headers: {
                          connection: 'keep-alive',
                          'user-agent': 'Chromeless 1.4.0',
                          accept: '*/*',
                          referer: 'http://opbeans-node:3000/dashboard',
                          'accept-encoding': 'gzip, deflate',
                          host: 'opbeans-node:3000'
                        }
                      },
                      response: {
                        headers: {
                          'x-powered-by': 'Express',
                          'content-type': 'text/javascript',
                          'content-length': '172',
                          date: 'Sun, 18 Nov 2018 20:53:42 GMT',
                          connection: 'keep-alive'
                        },
                        status_code: 200
                      }
                    },
                    trace: { id: '4399e7233e6e7b77e70c2fff111b8f28' },
                    timestamp: { us: 1542574422504004 },
                    agent: {
                      type: 'apm-server',
                      hostname: 'b359e3afece8',
                      version: '7.0.0-alpha1'
                    },
                    host: { name: 'b359e3afece8' }
                  },
                  sort: [1542574422504]
                }
              ]
            }
          }
        }
      ]
    }
  }
} as unknown) as ESResponse;
