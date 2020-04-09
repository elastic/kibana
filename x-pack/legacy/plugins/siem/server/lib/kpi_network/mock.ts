/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultIndexPattern } from '../../../default_index_pattern';
import { RequestBasicOptions } from '../framework/types';

export const mockOptions: RequestBasicOptions = {
  defaultIndex: defaultIndexPattern,
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

export const mockRequest = {
  body: {
    operationName: 'GetKpiNetworkQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: 1557445721842, to: 1557532121842 },
      filterQuery: '',
    },
    query:
      'fragment KpiNetworkChartFields on KpiNetworkHistogramData {\n  x\n  y\n  __typename\n}\n\nquery GetKpiNetworkQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String, $defaultIndex: [String!]!) {\n  source(id: $sourceId) {\n    id\n    KpiNetwork(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {\n      networkEvents\n      uniqueFlowId\n      uniqueSourcePrivateIps\n      uniqueSourcePrivateIpsHistogram {\n        ...KpiNetworkChartFields\n        __typename\n      }\n      uniqueDestinationPrivateIps\n      uniqueDestinationPrivateIpsHistogram {\n        ...KpiNetworkChartFields\n        __typename\n      }\n      dnsQueries\n      tlsHandshakes\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
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
const mockMsearchHeader = {
  index: 'defaultIndex',
  allowNoIndices: true,
  ignoreUnavailable: true,
};
const mockMsearchBody = {
  query: {},
  aggregations: {},
  size: 0,
  track_total_hits: false,
};
export const mockNetworkEventsQueryDsl = [mockMsearchHeader, mockMsearchBody];
export const mockUniqueFlowIdsQueryDsl = [
  mockMsearchHeader,
  { mockUniqueFlowIdsQueryDsl: 'mockUniqueFlowIdsQueryDsl' },
];
export const mockUniquePrvateIpsQueryDsl = [
  mockMsearchHeader,
  { mockUniquePrvateIpsQueryDsl: 'mockUniquePrvateIpsQueryDsl' },
];
export const mockDnsQueryDsl = [mockMsearchHeader, { mockDnsQueryDsl: 'mockDnsQueryDsl' }];
export const mockTlsHandshakesQueryDsl = [
  mockMsearchHeader,
  { mockTlsHandshakesQueryDsl: 'mockTlsHandshakesQueryDsl' },
];

export const mockMsearchOptions = {
  body: [
    ...mockNetworkEventsQueryDsl,
    ...mockDnsQueryDsl,
    ...mockUniquePrvateIpsQueryDsl,
    ...mockUniqueFlowIdsQueryDsl,
    ...mockTlsHandshakesQueryDsl,
  ],
};

const mockDsl = [
  JSON.stringify({ ...mockNetworkEventsQueryDsl[0], body: mockNetworkEventsQueryDsl[1] }, null, 2),
  JSON.stringify({ ...mockDnsQueryDsl[0], body: mockDnsQueryDsl[1] }, null, 2),
  JSON.stringify(
    { ...mockUniquePrvateIpsQueryDsl[0], body: mockUniquePrvateIpsQueryDsl[1] },
    null,
    2
  ),
  JSON.stringify({ ...mockUniqueFlowIdsQueryDsl[0], body: mockUniqueFlowIdsQueryDsl[1] }, null, 2),
  JSON.stringify({ ...mockTlsHandshakesQueryDsl[0], body: mockTlsHandshakesQueryDsl[1] }, null, 2),
];

export const mockResult = {
  inspect: {
    dsl: mockDsl,
    response: [
      JSON.stringify(mockResponse.responses[0], null, 2),
      JSON.stringify(mockResponse.responses[1], null, 2),
      JSON.stringify(mockResponse.responses[2], null, 2),
      JSON.stringify(mockResponse.responses[3], null, 2),
      JSON.stringify(mockResponse.responses[4], null, 2),
    ],
  },
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

export const mockResponseNoData = {
  responses: [null, null, null, null, null],
};

export const mockResultNoData = {
  inspect: {
    dsl: mockDsl,
    response: [
      JSON.stringify(mockResponseNoData.responses[0], null, 2),
      JSON.stringify(mockResponseNoData.responses[1], null, 2),
      JSON.stringify(mockResponseNoData.responses[2], null, 2),
      JSON.stringify(mockResponseNoData.responses[3], null, 2),
      JSON.stringify(mockResponseNoData.responses[4], null, 2),
    ],
  },
  networkEvents: null,
  uniqueFlowId: null,
  uniqueSourcePrivateIps: null,
  uniqueSourcePrivateIpsHistogram: null,
  uniqueDestinationPrivateIps: null,
  uniqueDestinationPrivateIpsHistogram: null,
  dnsQueries: null,
  tlsHandshakes: null,
};
