/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { IUrlParams } from '../../../../../context/UrlParamsContext/types';
import { IWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';

export const location = {
  pathname: '/services/opbeans-go/transactions/view',
  search:
    '?rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0&kuery=service.name%253A%2520%2522opbeans-java%2522%2520or%2520service.name%2520%253A%2520%2522opbeans-go%2522&traceId=513d33fafe99bbe6134749310c9b5322&transactionId=975c8d5bfd1dd20b&transactionName=GET%20%2Fapi%2Forders&transactionType=request',
  hash: ''
} as Location;

export const urlParams = {
  start: '2020-03-22T15:16:38.742Z',
  end: '2020-03-23T15:16:38.742Z',
  rangeFrom: 'now-24h',
  rangeTo: 'now',
  refreshPaused: true,
  refreshInterval: 0,
  page: 0,
  transactionId: '975c8d5bfd1dd20b',
  traceId: '513d33fafe99bbe6134749310c9b5322',
  kuery: 'service.name: "opbeans-java" or service.name : "opbeans-go"',
  transactionName: 'GET /api/orders',
  transactionType: 'request',
  processorEvent: 'transaction',
  serviceName: 'opbeans-go'
} as IUrlParams;

export const simpleWaterfall = ({
  entryTransaction: {
    parent: {
      id: 'fc107f7b556eb49b'
    },
    agent: {
      name: 'go',
      version: '1.7.2'
    },
    processor: {
      name: 'transaction',
      event: 'transaction'
    },
    url: {
      path: '/api/orders',
      scheme: 'http',
      port: 3000,
      domain: 'opbeans-go',
      full: 'http://opbeans-go:3000/api/orders'
    },
    trace: {
      id: '513d33fafe99bbe6134749310c9b5322'
    },
    '@timestamp': '2020-03-23T15:04:28.787Z',
    service: {
      node: {
        name: 'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29'
      },
      environment: 'production',
      name: 'opbeans-go',
      language: {
        name: 'go',
        version: 'go1.14.1'
      }
    },
    transaction: {
      duration: {
        us: 16597
      },
      result: 'HTTP 2xx',
      name: 'GET /api/orders',
      id: '975c8d5bfd1dd20b',
      span_count: {
        dropped: 0,
        started: 1
      },
      type: 'request',
      sampled: true
    },
    timestamp: {
      us: 1584975868787052
    }
  },
  rootTransaction: {
    container: {
      id: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e'
    },
    agent: {
      name: 'java',
      ephemeral_id: '99ce8403-5875-4945-b074-d37dc10563eb',
      version: '1.14.1-SNAPSHOT'
    },
    processor: {
      name: 'transaction',
      event: 'transaction'
    },
    url: {
      path: '/api/orders',
      scheme: 'http',
      port: 3000,
      domain: '172.19.0.9',
      full: 'http://172.19.0.9:3000/api/orders'
    },
    trace: {
      id: '513d33fafe99bbe6134749310c9b5322'
    },
    '@timestamp': '2020-03-23T15:04:28.785Z',
    service: {
      node: {
        name: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e'
      },
      environment: 'production',
      name: 'opbeans-java',
      runtime: {
        name: 'Java',
        version: '10.0.2'
      },
      language: {
        name: 'Java',
        version: '10.0.2'
      },
      version: 'None'
    },
    transaction: {
      duration: {
        us: 18842
      },
      result: 'HTTP 2xx',
      name: 'DispatcherServlet#doGet',
      id: '49809ad3c26adf74',
      span_count: {
        dropped: 0,
        started: 1
      },
      type: 'request',
      sampled: true
    },
    timestamp: {
      us: 1584975868785000
    }
  },
  duration: 16597,
  items: [
    {
      docType: 'transaction',
      doc: {
        parent: {
          id: 'fc107f7b556eb49b'
        },
        agent: {
          name: 'go',
          version: '1.7.2'
        },
        processor: {
          name: 'transaction',
          event: 'transaction'
        },
        url: {
          path: '/api/orders',
          scheme: 'http',
          port: 3000,
          domain: 'opbeans-go',
          full: 'http://opbeans-go:3000/api/orders'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        '@timestamp': '2020-03-23T15:04:28.787Z',
        service: {
          node: {
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29'
          },
          environment: 'production',
          framework: {
            name: 'gin',
            version: 'v1.4.0'
          },
          name: 'opbeans-go',
          runtime: {
            name: 'gc',
            version: 'go1.14.1'
          },
          language: {
            name: 'go',
            version: 'go1.14.1'
          },
          version: 'None'
        },
        transaction: {
          duration: {
            us: 16597
          },
          result: 'HTTP 2xx',
          name: 'GET /api/orders',
          id: '975c8d5bfd1dd20b',
          span_count: {
            dropped: 0,
            started: 1
          },
          type: 'request',
          sampled: true
        },
        timestamp: {
          us: 1584975868787052
        }
      },
      id: '975c8d5bfd1dd20b',
      parentId: 'fc107f7b556eb49b',
      duration: 16597,
      offset: 0,
      skew: 0
    },
    {
      docType: 'span',
      doc: {
        parent: {
          id: '975c8d5bfd1dd20b'
        },
        agent: {
          name: 'go',
          version: '1.7.2'
        },
        processor: {
          name: 'transaction',
          event: 'span'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        '@timestamp': '2020-03-23T15:04:28.787Z',
        service: {
          node: {
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29'
          },
          environment: 'production',
          name: 'opbeans-go',
          runtime: {
            name: 'gc',
            version: 'go1.14.1'
          },
          language: {
            name: 'go',
            version: 'go1.14.1'
          },
          version: 'None'
        },
        transaction: {
          id: '975c8d5bfd1dd20b'
        },
        timestamp: {
          us: 1584975868787174
        },
        span: {
          duration: {
            us: 16250
          },
          subtype: 'http',
          destination: {
            service: {
              resource: 'opbeans-python:3000',
              name: 'http://opbeans-python:3000',
              type: 'external'
            }
          },
          name: 'GET opbeans-python:3000',
          http: {
            response: {
              status_code: 200
            },
            url: {
              original: 'http://opbeans-python:3000/api/orders'
            }
          },
          id: 'daae24d83c269918',
          type: 'external'
        }
      },
      id: 'daae24d83c269918',
      parentId: '975c8d5bfd1dd20b',
      duration: 16250,
      offset: 122,
      skew: 0,
      parent: {
        docType: 'transaction',
        id: '975c8d5bfd1dd20b',
        parentId: 'fc107f7b556eb49b',
        duration: 16597,
        offset: 0,
        skew: 0
      }
    },
    {
      docType: 'transaction',
      doc: {
        parent: {
          id: 'daae24d83c269918'
        },
        agent: {
          name: 'python',
          version: '5.5.2'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        timestamp: {
          us: 1584975868788603
        },
        processor: {
          name: 'transaction',
          event: 'transaction'
        },
        url: {
          path: '/api/orders',
          scheme: 'http',
          port: 3000,
          domain: 'opbeans-go',
          full: 'http://opbeans-go:3000/api/orders'
        },
        '@timestamp': '2020-03-23T15:04:28.788Z',
        service: {
          node: {
            name:
              'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51'
          },
          environment: 'production',
          framework: {
            name: 'django',
            version: '2.1.13'
          },
          name: 'opbeans-python',
          runtime: {
            name: 'CPython',
            version: '3.6.10'
          },
          language: {
            name: 'python',
            version: '3.6.10'
          },
          version: 'None'
        },
        transaction: {
          result: 'HTTP 2xx',
          duration: {
            us: 14648
          },
          name: 'GET opbeans.views.orders',
          span_count: {
            dropped: 0,
            started: 1
          },
          id: '6fb0ff7365b87298',
          type: 'request',
          sampled: true
        }
      },
      id: '6fb0ff7365b87298',
      parentId: 'daae24d83c269918',
      duration: 14648,
      offset: 1551,
      skew: 0,
      parent: {
        docType: 'span',
        id: 'daae24d83c269918',
        parentId: '975c8d5bfd1dd20b',
        duration: 16250,
        offset: 122,
        skew: 0
      }
    },
    {
      docType: 'span',
      doc: {
        container: {
          id: 'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51'
        },
        parent: {
          id: '6fb0ff7365b87298'
        },
        agent: {
          name: 'python',
          version: '5.5.2'
        },
        processor: {
          name: 'transaction',
          event: 'span'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        '@timestamp': '2020-03-23T15:04:28.790Z',
        service: {
          node: {
            name:
              'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51'
          },
          environment: 'production',
          framework: {
            name: 'django',
            version: '2.1.13'
          },
          name: 'opbeans-python',
          runtime: {
            name: 'CPython',
            version: '3.6.10'
          },
          language: {
            name: 'python',
            version: '3.6.10'
          },
          version: 'None'
        },
        transaction: {
          id: '6fb0ff7365b87298'
        },
        timestamp: {
          us: 1584975868790080
        },
        span: {
          duration: {
            us: 2519
          },
          subtype: 'postgresql',
          name: 'SELECT FROM opbeans_order',
          destination: {
            service: {
              resource: 'postgresql',
              name: 'postgresql',
              type: 'db'
            }
          },
          action: 'query',
          id: 'c9407abb4d08ead1',
          type: 'db',
          sync: true,
          db: {
            statement:
              'SELECT "opbeans_order"."id", "opbeans_order"."customer_id", "opbeans_customer"."full_name", "opbeans_order"."created_at" FROM "opbeans_order" INNER JOIN "opbeans_customer" ON ("opbeans_order"."customer_id" = "opbeans_customer"."id")  LIMIT 1000',
            type: 'sql'
          }
        }
      },
      id: 'c9407abb4d08ead1',
      parentId: '6fb0ff7365b87298',
      duration: 2519,
      offset: 3028,
      skew: 0,
      parent: {
        docType: 'transaction',
        id: '6fb0ff7365b87298',
        parentId: 'daae24d83c269918',
        duration: 14648,
        offset: 1551,
        skew: 0
      }
    }
  ],
  errorsPerTransaction: {},
  errorsCount: 0,
  serviceColors: {
    'opbeans-go': '#6092c0',
    'opbeans-python': '#54b399'
  },
  errorItems: []
} as unknown) as IWaterfall;

export const waterfallWithErrors = ({
  entryTransaction: {
    parent: {
      id: 'fc107f7b556eb49b'
    },
    agent: {
      name: 'go',
      version: '1.7.2'
    },
    processor: {
      name: 'transaction',
      event: 'transaction'
    },
    url: {
      path: '/api/orders',
      scheme: 'http',
      port: 3000,
      domain: 'opbeans-go',
      full: 'http://opbeans-go:3000/api/orders'
    },
    trace: {
      id: '513d33fafe99bbe6134749310c9b5322'
    },
    '@timestamp': '2020-03-23T15:04:28.787Z',
    service: {
      node: {
        name: 'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29'
      },
      environment: 'production',
      name: 'opbeans-go',
      language: {
        name: 'go',
        version: 'go1.14.1'
      }
    },
    transaction: {
      duration: {
        us: 16597
      },
      result: 'HTTP 2xx',
      name: 'GET /api/orders',
      id: '975c8d5bfd1dd20b',
      span_count: {
        dropped: 0,
        started: 1
      },
      type: 'request',
      sampled: true
    },
    timestamp: {
      us: 1584975868787052
    }
  },
  rootTransaction: {
    container: {
      id: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e'
    },
    agent: {
      name: 'java',
      ephemeral_id: '99ce8403-5875-4945-b074-d37dc10563eb',
      version: '1.14.1-SNAPSHOT'
    },
    processor: {
      name: 'transaction',
      event: 'transaction'
    },
    url: {
      path: '/api/orders',
      scheme: 'http',
      port: 3000,
      domain: '172.19.0.9',
      full: 'http://172.19.0.9:3000/api/orders'
    },
    trace: {
      id: '513d33fafe99bbe6134749310c9b5322'
    },
    '@timestamp': '2020-03-23T15:04:28.785Z',
    service: {
      node: {
        name: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e'
      },
      environment: 'production',
      name: 'opbeans-java',
      runtime: {
        name: 'Java',
        version: '10.0.2'
      },
      language: {
        name: 'Java',
        version: '10.0.2'
      },
      version: 'None'
    },
    transaction: {
      duration: {
        us: 18842
      },
      result: 'HTTP 2xx',
      name: 'DispatcherServlet#doGet',
      id: '49809ad3c26adf74',
      span_count: {
        dropped: 0,
        started: 1
      },
      type: 'request',
      sampled: true
    },
    timestamp: {
      us: 1584975868785000
    }
  },
  duration: 16597,
  items: [
    {
      docType: 'transaction',
      doc: {
        parent: {
          id: 'fc107f7b556eb49b'
        },
        agent: {
          name: 'go',
          version: '1.7.2'
        },
        processor: {
          name: 'transaction',
          event: 'transaction'
        },
        url: {
          path: '/api/orders',
          scheme: 'http',
          port: 3000,
          domain: 'opbeans-go',
          full: 'http://opbeans-go:3000/api/orders'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        '@timestamp': '2020-03-23T15:04:28.787Z',
        service: {
          node: {
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29'
          },
          environment: 'production',
          framework: {
            name: 'gin',
            version: 'v1.4.0'
          },
          name: 'opbeans-go',
          runtime: {
            name: 'gc',
            version: 'go1.14.1'
          },
          language: {
            name: 'go',
            version: 'go1.14.1'
          },
          version: 'None'
        },
        transaction: {
          duration: {
            us: 16597
          },
          result: 'HTTP 2xx',
          name: 'GET /api/orders',
          id: '975c8d5bfd1dd20b',
          span_count: {
            dropped: 0,
            started: 1
          },
          type: 'request',
          sampled: true
        },
        timestamp: {
          us: 1584975868787052
        }
      },
      id: '975c8d5bfd1dd20b',
      parentId: 'fc107f7b556eb49b',
      duration: 16597,
      offset: 0,
      skew: 0
    },
    {
      docType: 'span',
      doc: {
        parent: {
          id: '975c8d5bfd1dd20b'
        },
        agent: {
          name: 'go',
          version: '1.7.2'
        },
        processor: {
          name: 'transaction',
          event: 'span'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        '@timestamp': '2020-03-23T15:04:28.787Z',
        service: {
          node: {
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29'
          },
          environment: 'production',
          name: 'opbeans-go',
          runtime: {
            name: 'gc',
            version: 'go1.14.1'
          },
          language: {
            name: 'go',
            version: 'go1.14.1'
          },
          version: 'None'
        },
        transaction: {
          id: '975c8d5bfd1dd20b'
        },
        timestamp: {
          us: 1584975868787174
        },
        span: {
          duration: {
            us: 16250
          },
          subtype: 'http',
          destination: {
            service: {
              resource: 'opbeans-python:3000',
              name: 'http://opbeans-python:3000',
              type: 'external'
            }
          },
          name: 'GET opbeans-python:3000',
          http: {
            response: {
              status_code: 200
            },
            url: {
              original: 'http://opbeans-python:3000/api/orders'
            }
          },
          id: 'daae24d83c269918',
          type: 'external'
        }
      },
      id: 'daae24d83c269918',
      parentId: '975c8d5bfd1dd20b',
      duration: 16250,
      offset: 122,
      skew: 0,
      parent: {
        docType: 'transaction',
        id: '975c8d5bfd1dd20b',
        parentId: 'fc107f7b556eb49b',
        duration: 16597,
        offset: 0,
        skew: 0
      }
    },
    {
      docType: 'transaction',
      doc: {
        parent: {
          id: 'daae24d83c269918'
        },
        agent: {
          name: 'python',
          version: '5.5.2'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        timestamp: {
          us: 1584975868788603
        },
        processor: {
          name: 'transaction',
          event: 'transaction'
        },
        url: {
          path: '/api/orders',
          scheme: 'http',
          port: 3000,
          domain: 'opbeans-go',
          full: 'http://opbeans-go:3000/api/orders'
        },
        '@timestamp': '2020-03-23T15:04:28.788Z',
        service: {
          node: {
            name:
              'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51'
          },
          environment: 'production',
          framework: {
            name: 'django',
            version: '2.1.13'
          },
          name: 'opbeans-python',
          runtime: {
            name: 'CPython',
            version: '3.6.10'
          },
          language: {
            name: 'python',
            version: '3.6.10'
          },
          version: 'None'
        },
        transaction: {
          result: 'HTTP 2xx',
          duration: {
            us: 14648
          },
          name: 'GET opbeans.views.orders',
          span_count: {
            dropped: 0,
            started: 1
          },
          id: '6fb0ff7365b87298',
          type: 'request',
          sampled: true
        }
      },
      id: '6fb0ff7365b87298',
      parentId: 'daae24d83c269918',
      duration: 14648,
      offset: 1551,
      skew: 0,
      parent: {
        docType: 'span',
        id: 'daae24d83c269918',
        parentId: '975c8d5bfd1dd20b',
        duration: 16250,
        offset: 122,
        skew: 0
      }
    },
    {
      docType: 'span',
      doc: {
        container: {
          id: 'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51'
        },
        parent: {
          id: '6fb0ff7365b87298'
        },
        agent: {
          name: 'python',
          version: '5.5.2'
        },
        processor: {
          name: 'transaction',
          event: 'span'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        '@timestamp': '2020-03-23T15:04:28.790Z',
        service: {
          node: {
            name:
              'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51'
          },
          environment: 'production',
          framework: {
            name: 'django',
            version: '2.1.13'
          },
          name: 'opbeans-python',
          runtime: {
            name: 'CPython',
            version: '3.6.10'
          },
          language: {
            name: 'python',
            version: '3.6.10'
          },
          version: 'None'
        },
        transaction: {
          id: '6fb0ff7365b87298'
        },
        timestamp: {
          us: 1584975868790080
        },
        span: {
          duration: {
            us: 2519
          },
          subtype: 'postgresql',
          name: 'SELECT FROM opbeans_order',
          destination: {
            service: {
              resource: 'postgresql',
              name: 'postgresql',
              type: 'db'
            }
          },
          action: 'query',
          id: 'c9407abb4d08ead1',
          type: 'db',
          sync: true,
          db: {
            statement:
              'SELECT "opbeans_order"."id", "opbeans_order"."customer_id", "opbeans_customer"."full_name", "opbeans_order"."created_at" FROM "opbeans_order" INNER JOIN "opbeans_customer" ON ("opbeans_order"."customer_id" = "opbeans_customer"."id")  LIMIT 1000',
            type: 'sql'
          }
        }
      },
      id: 'c9407abb4d08ead1',
      parentId: '6fb0ff7365b87298',
      duration: 2519,
      offset: 3028,
      skew: 0,
      parent: {
        docType: 'transaction',
        id: '6fb0ff7365b87298',
        parentId: 'daae24d83c269918',
        duration: 14648,
        offset: 1551,
        skew: 0
      }
    }
  ],
  errorsPerTransaction: {
    ['975c8d5bfd1dd20b']: 1,
    ['6fb0ff7365b87298']: 1
  },
  errorsCount: 1,
  serviceColors: {
    'opbeans-go': '#6092c0',
    'opbeans-python': '#54b399'
  },
  errorItems: [
    {
      docType: 'error',
      doc: {
        parent: {
          id: '975c8d5bfd1dd20b'
        },
        agent: {
          name: 'go',
          version: '1.7.2'
        },
        error: {
          culprit: 'logrusMiddleware',
          log: {
            level: 'error',
            message: 'GET //api/products (502)'
          },
          id: '1f3cb98206b5c54225cb7c8908a658da',
          grouping_key: '4dba2ff58fe6c036a5dee2ce411e512a'
        },
        processor: {
          name: 'error',
          event: 'error'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        '@timestamp': '2020-03-23T15:47:20.505Z',
        service: {
          node: {
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29'
          },
          environment: 'production',
          name: 'opbeans-go',
          runtime: {
            name: 'gc',
            version: 'go1.14.1'
          },
          language: {
            name: 'go',
            version: 'go1.14.1'
          },
          version: 'None'
        },
        transaction: {
          id: '975c8d5bfd1dd20b',
          sampled: false
        },
        timestamp: {
          us: 1584978440505118
        }
      },
      id: '1f3cb98206b5c54225cb7c8908a658da',
      parent: {
        docType: 'transaction',
        id: '975c8d5bfd1dd20b',
        parentId: 'fc107f7b556eb49b',
        duration: 16597,
        offset: 0,
        skew: 0
      },
      parentId: '975c8d5bfd1dd20b',
      offset: 200,
      skew: 0,
      duration: 0
    },
    {
      docType: 'error',
      doc: {
        parent: {
          id: '6fb0ff7365b87298'
        },
        agent: {
          name: 'python',
          version: '5.5.2'
        },
        error: {
          culprit: 'logrusMiddleware',
          log: {
            level: 'error',
            message: 'GET //api/products (502)'
          },
          id: '1f3cb98206b5c54225cb7c8908a658d2',
          grouping_key: '4dba2ff58fe6c036a5dee2ce411e512a'
        },
        processor: {
          name: 'error',
          event: 'error'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        '@timestamp': '2020-03-23T15:47:20.505Z',
        service: {
          node: {
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29'
          },
          environment: 'production',
          name: 'opbeans-python',
          runtime: {
            name: 'gc',
            version: 'go1.14.1'
          },
          version: 'None'
        },
        transaction: {
          id: '6fb0ff7365b87298',
          sampled: false
        },
        timestamp: {
          us: 1584978440505118
        }
      },
      id: '1f3cb98206b5c54225cb7c8908a658d2',
      parent: {
        docType: 'transaction',
        id: '6fb0ff7365b87298',
        parentId: 'fc107f7b556eb49b',
        duration: 16597,
        offset: 0,
        skew: 0
      },
      parentId: '6fb0ff7365b87298',
      offset: 5000,
      skew: 50,
      duration: 10
    }
  ]
} as unknown) as IWaterfall;

export const waterfallChildStartBeforeParent = ({
  entryTransaction: {
    parent: {
      id: 'fc107f7b556eb49b'
    },
    agent: {
      name: 'go',
      version: '1.7.2'
    },
    processor: {
      name: 'transaction',
      event: 'transaction'
    },
    url: {
      path: '/api/orders',
      scheme: 'http',
      port: 3000,
      domain: 'opbeans-go',
      full: 'http://opbeans-go:3000/api/orders'
    },
    trace: {
      id: '513d33fafe99bbe6134749310c9b5322'
    },
    '@timestamp': '2020-03-23T15:04:28.787Z',
    service: {
      node: {
        name: 'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29'
      },
      environment: 'production',
      name: 'opbeans-go',
      language: {
        name: 'go',
        version: 'go1.14.1'
      }
    },
    transaction: {
      duration: {
        us: 16597
      },
      result: 'HTTP 2xx',
      name: 'GET /api/orders',
      id: '975c8d5bfd1dd20b',
      span_count: {
        dropped: 0,
        started: 1
      },
      type: 'request',
      sampled: true
    },
    timestamp: {
      us: 1584975868787052
    }
  },
  rootTransaction: {
    container: {
      id: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e'
    },
    agent: {
      name: 'java',
      ephemeral_id: '99ce8403-5875-4945-b074-d37dc10563eb',
      version: '1.14.1-SNAPSHOT'
    },
    processor: {
      name: 'transaction',
      event: 'transaction'
    },
    url: {
      path: '/api/orders',
      scheme: 'http',
      port: 3000,
      domain: '172.19.0.9',
      full: 'http://172.19.0.9:3000/api/orders'
    },
    trace: {
      id: '513d33fafe99bbe6134749310c9b5322'
    },
    '@timestamp': '2020-03-23T15:04:28.785Z',
    service: {
      node: {
        name: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e'
      },
      environment: 'production',
      name: 'opbeans-java',
      runtime: {
        name: 'Java',
        version: '10.0.2'
      },
      language: {
        name: 'Java',
        version: '10.0.2'
      },
      version: 'None'
    },
    transaction: {
      duration: {
        us: 18842
      },
      result: 'HTTP 2xx',
      name: 'DispatcherServlet#doGet',
      id: '49809ad3c26adf74',
      span_count: {
        dropped: 0,
        started: 1
      },
      type: 'request',
      sampled: true
    },
    timestamp: {
      us: 1584975868785000
    }
  },
  duration: 16597,
  items: [
    {
      docType: 'transaction',
      doc: {
        parent: {
          id: 'fc107f7b556eb49b'
        },
        agent: {
          name: 'go',
          version: '1.7.2'
        },
        processor: {
          name: 'transaction',
          event: 'transaction'
        },
        url: {
          path: '/api/orders',
          scheme: 'http',
          port: 3000,
          domain: 'opbeans-go',
          full: 'http://opbeans-go:3000/api/orders'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        '@timestamp': '2020-03-23T15:04:28.787Z',
        service: {
          node: {
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29'
          },
          environment: 'production',
          framework: {
            name: 'gin',
            version: 'v1.4.0'
          },
          name: 'opbeans-go',
          runtime: {
            name: 'gc',
            version: 'go1.14.1'
          },
          language: {
            name: 'go',
            version: 'go1.14.1'
          },
          version: 'None'
        },
        transaction: {
          duration: {
            us: 16597
          },
          result: 'HTTP 2xx',
          name: 'GET /api/orders',
          id: '975c8d5bfd1dd20b',
          span_count: {
            dropped: 0,
            started: 1
          },
          type: 'request',
          sampled: true
        },
        timestamp: {
          us: 1584975868787052
        }
      },
      id: '975c8d5bfd1dd20b',
      parentId: 'fc107f7b556eb49b',
      duration: 16597,
      offset: 0,
      skew: 0
    },
    {
      docType: 'span',
      doc: {
        parent: {
          id: '975c8d5bfd1dd20b'
        },
        agent: {
          name: 'go',
          version: '1.7.2'
        },
        processor: {
          name: 'transaction',
          event: 'span'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        '@timestamp': '2020-03-23T15:04:28.787Z',
        service: {
          node: {
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29'
          },
          environment: 'production',
          name: 'opbeans-go',
          runtime: {
            name: 'gc',
            version: 'go1.14.1'
          },
          language: {
            name: 'go',
            version: 'go1.14.1'
          },
          version: 'None'
        },
        transaction: {
          id: '975c8d5bfd1dd20b'
        },
        timestamp: {
          us: 1584975868787174
        },
        span: {
          duration: {
            us: 16250
          },
          subtype: 'http',
          destination: {
            service: {
              resource: 'opbeans-python:3000',
              name: 'http://opbeans-python:3000',
              type: 'external'
            }
          },
          name: 'I am his 👇🏻 parent 😡 (2020-03-23T15:04:28.787Z)',
          http: {
            response: {
              status_code: 200
            },
            url: {
              original: 'http://opbeans-python:3000/api/orders'
            }
          },
          id: 'daae24d83c269918',
          type: 'external'
        }
      },
      id: 'daae24d83c269918',
      parentId: '975c8d5bfd1dd20b',
      duration: 16250,
      offset: 122,
      skew: 0,
      parent: {
        docType: 'transaction',
        id: '975c8d5bfd1dd20b',
        parentId: 'fc107f7b556eb49b',
        duration: 16597,
        offset: 0,
        skew: 0
      }
    },
    {
      docType: 'transaction',
      doc: {
        parent: {
          id: 'daae24d83c269918'
        },
        agent: {
          name: 'python',
          version: '5.5.2'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        timestamp: {
          us: 1584975868688000
        },
        processor: {
          name: 'transaction',
          event: 'transaction'
        },
        url: {
          path: '/api/orders',
          scheme: 'http',
          port: 3000,
          domain: 'opbeans-go',
          full: 'http://opbeans-go:3000/api/orders'
        },
        '@timestamp': '2020-03-23T16:04:28.688Z',
        service: {
          node: {
            name:
              'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51'
          },
          environment: 'production',
          framework: {
            name: 'django',
            version: '2.1.13'
          },
          name: 'opbeans-python',
          runtime: {
            name: 'CPython',
            version: '3.6.10'
          },
          language: {
            name: 'python',
            version: '3.6.10'
          },
          version: 'None'
        },
        transaction: {
          result: 'HTTP 2xx',
          duration: {
            us: 14648
          },
          name: 'I started before my parent 😩 (2020-03-23T16:04:28.688Z)',
          span_count: {
            dropped: 0,
            started: 1
          },
          id: '6fb0ff7365b87298',
          type: 'request',
          sampled: true
        }
      },
      id: '6fb0ff7365b87298',
      parentId: 'daae24d83c269918',
      duration: 1454,
      offset: 1551,
      skew: 7497,
      parent: {
        docType: 'span',
        id: 'daae24d83c269918',
        parentId: '975c8d5bfd1dd20b',
        duration: 16250,
        offset: 122,
        skew: 0
      }
    },
    {
      docType: 'span',
      doc: {
        container: {
          id: 'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51'
        },
        parent: {
          id: '6fb0ff7365b87298'
        },
        agent: {
          name: 'python',
          version: '5.5.2'
        },
        processor: {
          name: 'transaction',
          event: 'span'
        },
        trace: {
          id: '513d33fafe99bbe6134749310c9b5322'
        },
        '@timestamp': '2020-03-23T15:04:28.790Z',
        service: {
          node: {
            name:
              'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51'
          },
          environment: 'production',
          framework: {
            name: 'django',
            version: '2.1.13'
          },
          name: 'opbeans-python',
          runtime: {
            name: 'CPython',
            version: '3.6.10'
          },
          language: {
            name: 'python',
            version: '3.6.10'
          },
          version: 'None'
        },
        transaction: {
          id: '6fb0ff7365b87298'
        },
        timestamp: {
          us: 1584975868790080
        },
        span: {
          duration: {
            us: 2519
          },
          subtype: 'postgresql',
          name: 'I am using my parents skew 😇 (2020-03-23T15:04:28.790Z)',
          destination: {
            service: {
              resource: 'postgresql',
              name: 'postgresql',
              type: 'db'
            }
          },
          action: 'query',
          id: 'c9407abb4d08ead1',
          type: 'db',
          sync: true,
          db: {
            statement:
              'SELECT "opbeans_order"."id", "opbeans_order"."customer_id", "opbeans_customer"."full_name", "opbeans_order"."created_at" FROM "opbeans_order" INNER JOIN "opbeans_customer" ON ("opbeans_order"."customer_id" = "opbeans_customer"."id")  LIMIT 1000',
            type: 'sql'
          }
        }
      },
      id: 'c9407abb4d08ead1',
      parentId: '6fb0ff7365b87298',
      duration: 2519,
      offset: 3028,
      skew: 7497,
      parent: {
        docType: 'transaction',
        id: '6fb0ff7365b87298',
        parentId: 'daae24d83c269918',
        duration: 14648,
        offset: 1551,
        skew: 0
      }
    }
  ],
  errorsPerTransaction: {},
  errorsCount: 0,
  serviceColors: {
    'opbeans-go': '#6092c0',
    'opbeans-python': '#54b399'
  },
  errorItems: []
} as unknown) as IWaterfall;
