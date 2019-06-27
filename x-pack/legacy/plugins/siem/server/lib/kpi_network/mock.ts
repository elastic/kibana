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
      'fragment KpiIpDetailsChartFields on KpiIpDetailsHistogramData {\n  x\n  y\n  __typename\n}\n\nquery GetKpiIpDetailsQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String, $defaultIndex: [String!]!, $ip: String!) {\n  source(id: $sourceId) {\n    id\n    KpiIpDetails(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex, ip: $ip) {\n      connections\n      hosts\n      sourcePackets\n      sourcePacketsHistogram {\n        ...KpiIpDetailsChartFields\n        __typename\n      }\n      sourceByte\n      sourceByteHistogram {\n        ...KpiIpDetailsChartFields\n        __typename\n      }\n      destinationPackets\n      destinationPacketsHistogram {\n        ...KpiIpDetailsChartFields\n        __typename\n      }\n      destinationByte\n      destinationByteHistogram {\n        ...KpiIpDetailsChartFields\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
};

export const mockKpiIpDetailsResponse = {
  responses: [
    {
      took: 4295,
      timed_out: false,
      _shards: {
        total: 31,
        successful: 31,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 228246187,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        connections: {
          value: 13368,
        },
        destination: {
          doc_count: 6454,
          packetsHistogram: {
            buckets: [
              {
                key_as_string: '2019-06-14T00:00:00.000Z',
                key: 1560470400000,
                doc_count: 1775,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2019-06-15T00:00:00.000Z',
                key: 1560556800000,
                doc_count: 1763,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2019-06-16T00:00:00.000Z',
                key: 1560643200000,
                doc_count: 1796,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2019-06-17T00:00:00.000Z',
                key: 1560729600000,
                doc_count: 1111,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2019-06-18T00:00:00.000Z',
                key: 1560816000000,
                doc_count: 9,
                count: {
                  value: 0,
                },
              },
            ],
            interval: '1d',
          },
          bytes: {
            value: 0,
          },
          hosts: {
            value: 4,
          },
          bytesHistogram: {
            buckets: [
              {
                key_as_string: '2019-06-14T00:00:00.000Z',
                key: 1560470400000,
                doc_count: 1775,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2019-06-15T00:00:00.000Z',
                key: 1560556800000,
                doc_count: 1763,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2019-06-16T00:00:00.000Z',
                key: 1560643200000,
                doc_count: 1796,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2019-06-17T00:00:00.000Z',
                key: 1560729600000,
                doc_count: 1111,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2019-06-18T00:00:00.000Z',
                key: 1560816000000,
                doc_count: 9,
                count: {
                  value: 0,
                },
              },
            ],
            interval: '1d',
          },
          packets: {
            value: 0,
          },
        },
        source: {
          doc_count: 6914,
          packetsHistogram: {
            buckets: [
              {
                key_as_string: '2019-06-14T00:00:00.000Z',
                key: 1560470400000,
                doc_count: 1898,
                count: {
                  value: 5556185,
                },
              },
              {
                key_as_string: '2019-06-15T00:00:00.000Z',
                key: 1560556800000,
                doc_count: 1896,
                count: {
                  value: 2669758,
                },
              },
              {
                key_as_string: '2019-06-16T00:00:00.000Z',
                key: 1560643200000,
                doc_count: 1908,
                count: {
                  value: 2612273,
                },
              },
              {
                key_as_string: '2019-06-17T00:00:00.000Z',
                key: 1560729600000,
                doc_count: 1203,
                count: {
                  value: 1710466,
                },
              },
              {
                key_as_string: '2019-06-18T00:00:00.000Z',
                key: 1560816000000,
                doc_count: 9,
                count: {
                  value: 26540,
                },
              },
            ],
            interval: '1d',
          },
          bytes: {
            value: 80647226799,
          },
          hosts: {
            value: 4,
          },
          bytesHistogram: {
            buckets: [
              {
                key_as_string: '2019-06-14T00:00:00.000Z',
                key: 1560470400000,
                doc_count: 1898,
                count: {
                  value: 35934887439,
                },
              },
              {
                key_as_string: '2019-06-15T00:00:00.000Z',
                key: 1560556800000,
                doc_count: 1896,
                count: {
                  value: 17055922318,
                },
              },
              {
                key_as_string: '2019-06-16T00:00:00.000Z',
                key: 1560643200000,
                doc_count: 1908,
                count: {
                  value: 16677974647,
                },
              },
              {
                key_as_string: '2019-06-17T00:00:00.000Z',
                key: 1560729600000,
                doc_count: 1203,
                count: {
                  value: 10814051075,
                },
              },
              {
                key_as_string: '2019-06-18T00:00:00.000Z',
                key: 1560816000000,
                doc_count: 9,
                count: {
                  value: 164391320,
                },
              },
            ],
            interval: '1d',
          },
          packets: {
            value: 12575222,
          },
        },
      },
      status: 200,
    },
  ],
};

export const mockKpiIpDetailsResult = {
  connections: 13368,
  hosts: 4,
  sourcePackets: 12575222,
  sourcePacketsHistogram: [
    {
      x: new Date('2019-06-14T00:00:00.000Z').valueOf(),
      y: 5556185,
    },
    {
      x: new Date('2019-06-15T00:00:00.000Z').valueOf(),
      y: 2669758,
    },
    {
      x: new Date('2019-06-16T00:00:00.000Z').valueOf(),
      y: 2612273,
    },
    {
      x: new Date('2019-06-17T00:00:00.000Z').valueOf(),
      y: 1710466,
    },
    {
      x: new Date('2019-06-18T00:00:00.000Z').valueOf(),
      y: 26540,
    },
  ],
  sourceByte: 80647226799,
  sourceByteHistogram: [
    {
      x: new Date('2019-06-14T00:00:00.000Z').valueOf(),
      y: 35934887439,
    },
    {
      x: new Date('2019-06-15T00:00:00.000Z').valueOf(),
      y: 17055922318,
    },
    {
      x: new Date('2019-06-16T00:00:00.000Z').valueOf(),
      y: 16677974647,
    },
    {
      x: new Date('2019-06-17T00:00:00.000Z').valueOf(),
      y: 10814051075,
    },
    {
      x: new Date('2019-06-18T00:00:00.000Z').valueOf(),
      y: 164391320,
    },
  ],
  destinationPackets: 0,
  destinationPacketsHistogram: [
    {
      x: new Date('2019-06-14T00:00:00.000Z').valueOf(),
      y: 0,
    },
    {
      x: new Date('2019-06-15T00:00:00.000Z').valueOf(),
      y: 0,
    },
    {
      x: new Date('2019-06-16T00:00:00.000Z').valueOf(),
      y: 0,
    },
    {
      x: new Date('2019-06-17T00:00:00.000Z').valueOf(),
      y: 0,
    },
    {
      x: new Date('2019-06-18T00:00:00.000Z').valueOf(),
      y: 0,
    },
  ],
  destinationByte: 0,
  destinationByteHistogram: [
    {
      x: new Date('2019-06-14T00:00:00.000Z').valueOf(),
      y: 0,
    },
    {
      x: new Date('2019-06-15T00:00:00.000Z').valueOf(),
      y: 0,
    },
    {
      x: new Date('2019-06-16T00:00:00.000Z').valueOf(),
      y: 0,
    },
    {
      x: new Date('2019-06-17T00:00:00.000Z').valueOf(),
      y: 0,
    },
    {
      x: new Date('2019-06-18T00:00:00.000Z').valueOf(),
      y: 0,
    },
  ],
};
