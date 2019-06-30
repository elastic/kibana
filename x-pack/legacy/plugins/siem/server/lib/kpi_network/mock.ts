/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestBasicOptions } from '../framework/types';

export const mockOptions: RequestBasicOptions = {
  defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  sourceConfiguration: {
    fields: {
      container: 'docker.container.name',
      host: 'beat.hostname',
      message: ['message', '@message'],
      pod: 'kubernetes.pod.name',
      tiebreaker: '_doc',
      timestamp: '@timestamp',
    },
  },
  timerange: { interval: '12h', to: 1549852006071, from: 1549765606071 },
  filterQuery: {},
};

export const mockMsearchOptions = {
  body: [],
};

export const mockRequest = {
  params: {},
  payload: {
    operationName: 'GetKpiNetworkQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: 1557445721842, to: 1557532121842 },
      filterQuery: '',
    },
    query:
      'fragment KpiNetworkChartFields on KpiNetworkHistogramData {\n  x\n  y\n  __typename\n}\n\nquery GetKpiNetworkQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String, $defaultIndex: [String!]!) {\n  source(id: $sourceId) {\n    id\n    KpiNetwork(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {\n      networkEvents\n      uniqueFlowId\n      uniqueSourcePrivateIps\n      uniqueSourcePrivateIpsHistogram {\n        ...KpiNetworkChartFields\n        __typename\n      }\n      uniqueDestinationPrivateIps\n      uniqueDestinationPrivateIpsHistogram {\n        ...KpiNetworkChartFields\n        __typename\n      }\n      dnsQueries\n      tlsHandshakes\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
};

export const mockResponse = {
  responses: [
    {
      took: 384,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 733106,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      status: 200,
    },
    {
      took: 64,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 10942,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      status: 200,
    },
    {
      took: 224,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 480755,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        source: {
          histogram: {
            buckets: [
              {
                key_as_string: '2019-05-09T23:00:00.000Z',
                key: 1557442800000,
                doc_count: 42109,
                count: {
                  value: 14,
                },
              },
              {
                key_as_string: '2019-05-10T11:00:00.000Z',
                key: 1557486000000,
                doc_count: 437160,
                count: {
                  value: 385,
                },
              },
              {
                key_as_string: '2019-05-10T23:00:00.000Z',
                key: 1557529200000,
                doc_count: 1486,
                count: {
                  value: 7,
                },
              },
            ],
            interval: '12h',
          },
          unique_private_ips: {
            value: 387,
          },
        },
        destination: {
          histogram: {
            buckets: [
              {
                key_as_string: '2019-05-09T23:00:00.000Z',
                key: 1557442800000,
                doc_count: 36253,
                count: {
                  value: 11,
                },
              },
              {
                key_as_string: '2019-05-10T11:00:00.000Z',
                key: 1557486000000,
                doc_count: 421719,
                count: {
                  value: 877,
                },
              },
              {
                key_as_string: '2019-05-10T23:00:00.000Z',
                key: 1557529200000,
                doc_count: 1311,
                count: {
                  value: 7,
                },
              },
            ],
            interval: '12h',
          },
          unique_private_ips: {
            value: 878,
          },
        },
      },
      status: 200,
    },
    {
      took: 384,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 733106,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        unique_flow_id: {
          value: 195415,
        },
      },
      status: 200,
    },
    {
      took: 57,
      timed_out: false,
      _shards: {
        total: 10,
        successful: 10,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 54482,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      status: 200,
    },
  ],
};

export const mockResult = {
  dnsQueries: 10942,
  networkEvents: 733106,
  tlsHandshakes: 54482,
  uniqueDestinationPrivateIps: 878,
  uniqueDestinationPrivateIpsHistogram: [
    {
      x: new Date('2019-05-09T23:00:00.000Z').valueOf(),
      y: 11,
    },
    {
      x: new Date('2019-05-10T11:00:00.000Z').valueOf(),
      y: 877,
    },
    {
      x: new Date('2019-05-10T23:00:00.000Z').valueOf(),
      y: 7,
    },
  ],
  uniqueFlowId: 195415,
  uniqueSourcePrivateIps: 387,
  uniqueSourcePrivateIpsHistogram: [
    {
      x: new Date('2019-05-09T23:00:00.000Z').valueOf(),
      y: 14,
    },
    {
      x: new Date('2019-05-10T11:00:00.000Z').valueOf(),
      y: 385,
    },
    {
      x: new Date('2019-05-10T23:00:00.000Z').valueOf(),
      y: 7,
    },
  ],
};

export const mockKpiIpDetailsRequestOptions: RequestBasicOptions = {
  defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  sourceConfiguration: {
    fields: {
      container: 'docker.container.name',
      message: ['message', '@message'],
      pod: 'kubernetes.pod.name',
      tiebreaker: '_doc',
      timestamp: '@timestamp',
      host: 'beat.hostname',
    },
  },
  timerange: { interval: '12h', to: 1549852006071, from: 1549765606071 },
  filterQuery: { term: { ip: '192.168.1.1' } },
};

export const mockKpiIpDetailsRequest = {
  params: {},
  payload: {
    operationName: 'GetKpiIpDetailsQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: 1557445721842, to: 1557532121842 },
      filterQuery: { term: { ip: '10.142.0.10' } },
    },
    query:
      'query GetKpiIpDetailsQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String, $defaultIndex: [String!]!) {\n  source(id: $sourceId) {\n    id\n    KpiIpDetails(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {\n      sourceByte\n      destinationByte\n      topSourceIp\n      topDestinationIp\n      topSourceIpTransportBytes\n      topDestinationIpTransportBytes\n      topDestinationPort\n      topTransport\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
};

export const mockKpiIpDetailsResponse = {
  took: 1385,
  responses: [
    {
      took: 1198,
      timed_out: false,
      _shards: {
        total: 32,
        successful: 32,
        skipped: 25,
        failed: 0,
      },
      hits: {
        total: {
          value: 3383183,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        destination: {
          value: 19194998916519,
        },
        source: {
          value: 206303493933520,
        },
      },
      status: 200,
    },
    {
      took: 1377,
      timed_out: false,
      _shards: {
        total: 32,
        successful: 32,
        skipped: 25,
        failed: 0,
      },
      hits: {
        total: {
          value: 3383183,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        destination: {
          doc_count_error_upper_bound: -1,
          sum_other_doc_count: 2096460,
          buckets: [
            {
              key: '35.227.125.33',
              doc_count: 203938,
              destination: {
                value: 19173481510870,
              },
              source: {
                value: 205552178090732,
              },
            },
            {
              key: '10.142.0.10',
              doc_count: 206728,
              destination: {
                value: 0,
              },
              source: {
                value: 273770689437,
              },
            },
            {
              key: '107.190.46.185',
              doc_count: 8430,
              destination: {
                value: 0,
              },
              source: {
                value: 146454288721,
              },
            },
            {
              key: '10.142.0.9',
              doc_count: 676,
              destination: {
                value: 0,
              },
              source: {
                value: 31908657731,
              },
            },
            {
              key: '104.198.38.169',
              doc_count: 145,
              destination: {
                value: 0,
              },
              source: {
                value: 25579248995,
              },
            },
          ],
        },
        source: {
          doc_count_error_upper_bound: -1,
          sum_other_doc_count: 1357660,
          buckets: [
            {
              key: '10.128.0.4',
              doc_count: 71338,
              destination: {
                value: 10680686561824,
              },
              source: {
                value: 119018189350041,
              },
            },
            {
              key: '10.128.0.5',
              doc_count: 74906,
              destination: {
                value: 8493223862327,
              },
              source: {
                value: 86299486746697,
              },
            },
            {
              key: '10.142.0.10',
              doc_count: 304545,
              destination: {
                value: 0,
              },
              source: {
                value: 634897457454,
              },
            },
            {
              key: '35.227.125.33',
              doc_count: 135526,
              destination: {
                value: 0,
              },
              source: {
                value: 243052535952,
              },
            },
            {
              key: '52.11.199.171',
              doc_count: 144,
              destination: {
                value: 0,
              },
              source: {
                value: 26739535340,
              },
            },
          ],
        },
      },
      status: 200,
    },
    {
      took: 1177,
      timed_out: false,
      _shards: {
        total: 32,
        successful: 32,
        skipped: 25,
        failed: 0,
      },
      hits: {
        total: {
          value: 3383183,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        destination: {
          doc_count_error_upper_bound: -1,
          sum_other_doc_count: 2152196,
          buckets: [
            {
              '1': {
                value: 205326199085162,
              },
              '3': {
                value: 19173481510870,
              },
              key: 9200,
              doc_count: 226694,
            },
            {
              '1': {
                value: 274008975078,
              },
              '3': {
                value: 0,
              },
              key: 9243,
              doc_count: 56997,
            },
            {
              '1': {
                value: 26775225536,
              },
              '3': {
                value: 0,
              },
              key: 38140,
              doc_count: 157,
            },
            {
              '1': {
                value: 5212431341,
              },
              '3': {
                value: 0,
              },
              key: 33682,
              doc_count: 163,
            },
            {
              '1': {
                value: 3443728962,
              },
              '3': {
                value: 20832369631,
              },
              key: 443,
              doc_count: 77299,
            },
          ],
        },
      },
      status: 200,
    },
    {
      took: 1184,
      timed_out: false,
      _shards: {
        total: 32,
        successful: 32,
        skipped: 25,
        failed: 0,
      },
      hits: {
        total: {
          value: 3383183,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        transport: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 316,
          buckets: [
            {
              '1': {
                value: 225532996598778,
              },
              key: 'tcp',
              doc_count: 805731,
            },
            {
              '1': {
                value: 5404352,
              },
              key: 'udp',
              doc_count: 83446,
            },
            {
              '1': {
                value: 414653,
              },
              key: 'icmp',
              doc_count: 2745,
            },
          ],
        },
      },
      status: 200,
    },
  ],
};

export const mockKpiIpDetailsResult = {
  sourceByte: 206303493933520,
  destinationByte: 19194998916519,
  topSourceIp: '10.128.0.4',
  topDestinationIp: '35.227.125.33',
  topSourceIpTransportBytes: 119018189350041,
  topDestinationIpTransportBytes: 19173481510870,
  topDestinationPort: 9200,
  topTransport: 'tcp',
};
