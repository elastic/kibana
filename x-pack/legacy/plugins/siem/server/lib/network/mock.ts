/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, FlowDirection, FlowTarget, NetworkTopNFlowFields } from '../../graphql/types';

import { NetworkTopNFlowRequestOptions } from '.';

export const mockOptions: NetworkTopNFlowRequestOptions = {
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
  pagination: {
    activePage: 0,
    cursorStart: 0,
    fakePossibleCount: 50,
    querySize: 10,
  },
  filterQuery: {},
  fields: [
    'totalCount',
    'source.ip',
    'source.domain',
    'source.__typename',
    'destination.ip',
    'destination.domain',
    'destination.__typename',
    'event.duration',
    'event.__typename',
    'network.bytes',
    'network.packets',
    'network.__typename',
    '__typename',
    'edges.cursor.value',
    'edges.cursor.__typename',
    'edges.__typename',
    'pageInfo.activePage',
    'pageInfo.__typename',
    'pageInfo.fakeTotalCount',
    'pageInfo.__typename',
    'pageInfo.showMorePagesIndicator',
    'pageInfo.__typename',
    '__typename',
  ],
  networkTopNFlowSort: { field: NetworkTopNFlowFields.bytes, direction: Direction.desc },
  flowTarget: FlowTarget.source,
  flowDirection: FlowDirection.uniDirectional,
};

export const mockRequest = {
  params: {},
  payload: {
    operationName: 'GetNetworkTopNFlowQuery',
    variables: {
      filterQuery: '',
      flowDirection: FlowDirection.uniDirectional,
      flowType: FlowTarget.source,
      pagination: {
        activePage: 0,
        cursorStart: 0,
        fakePossibleCount: 50,
        querySize: 10,
      },
      sourceId: 'default',
      timerange: { interval: '12h', from: 1549765830772, to: 1549852230772 },
    },
    query: `query GetNetworkTopNFlowQuery($sourceId: ID!, $flowDirection: FlowDirection!, $sort: NetworkTopNFlowSortField!, $flowTarget: FlowTarget!, $timerange: TimerangeInput!, $pagination: PaginationInput!, $filterQuery: String) {
        source(id: $sourceId) {
          id
          NetworkTopNFlow(flowDirection: $flowDirection, sort: $sort, flowTarget: $flowTarget, timerange: $timerange, pagination: $pagination, filterQuery: $filterQuery) {
            totalCount
            edges {
              node {
              source {
                ip
                domain
                count
                __typename
              }
              destination {
                ip
                domain
                count
                __typename
              }
              network {
                bytes
                packets
                direction
                __typename
              }
            __typename
            }
            cursor {
              value
              __typename
            }
            __typename
          }
          pageInfo {
            activePage
            __typename
            fakeTotalCount
            __typename
            showMorePagesIndicator
            __typename
          }
          __typename
        }
        __typename
      }
    }`,
  },
};

export const mockResponse = {
  took: 122,
  timed_out: false,
  _shards: {
    total: 11,
    successful: 11,
    skipped: 0,
    failed: 0,
  },
  hits: {
    max_score: null,
    hits: [],
  },
  aggregations: {
    top_n_flow_count: {
      value: 545,
    },
    top_uni_flow: {
      buckets: [
        {
          key: '1.1.1.1',
          bytes_in: {
            value: 11276023407,
          },
          bytes_out: {
            value: 1025631,
          },
          location: {
            value: 'San Francisco, CA, USA',
          },
          autonomous_system: {
            value: 'whatevenisthis',
          },
          domain: {
            buckets: [
              {
                key: 'test.1.net',
              },
            ],
          },
        },
        {
          key: '2.2.2.2',
          bytes_in: {
            value: 5469323342,
          },
          bytes_out: {
            value: 2811441,
          },
          location: {
            value: 'San Francisco, CA, USA',
          },
          autonomous_system: {
            value: 'whatevenisthis',
          },
          domain: {
            buckets: [
              {
                key: 'test.2.net',
              },
            ],
          },
        },
        {
          key: '3.3.3.3',
          bytes_in: {
            value: 3807671322,
          },
          bytes_out: {
            value: 4494034,
          },
          location: {
            value: 'San Francisco, CA, USA',
          },
          autonomous_system: {
            value: 'whatevenisthis',
          },
          domain: {
            buckets: [
              {
                key: 'test.3.com',
              },
              {
                key: 'test.3-duplicate.com',
              },
            ],
          },
        },
        {
          key: '4.4.4.4',
          bytes_in: {
            value: 166517626,
          },
          bytes_out: {
            value: 3194782,
          },
          location: {
            value: 'San Francisco, CA, USA',
          },
          autonomous_system: {
            value: 'whatevenisthis',
          },
          domain: {
            buckets: [
              {
                key: 'test.4.com',
              },
            ],
          },
        },
        {
          key: '5.5.5.5',
          bytes_in: {
            value: 104785026,
          },
          bytes_out: {
            value: 1838597,
          },
          location: {
            value: 'San Francisco, CA, USA',
          },
          autonomous_system: {
            value: 'whatevenisthis',
          },
          domain: {
            buckets: [
              {
                key: 'test.5.com',
              },
            ],
          },
        },
        {
          key: '6.6.6.6',
          bytes_in: {
            value: 28804250,
          },
          bytes_out: {
            value: 482982,
          },
          location: {
            value: 'San Francisco, CA, USA',
          },
          autonomous_system: {
            value: 'whatevenisthis',
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 31,
            buckets: [
              {
                key: 'test.6.com',
              },
            ],
          },
        },
        {
          key: '7.7.7.7',
          bytes_in: {
            value: 23032363,
          },
          bytes_out: {
            value: 400623,
          },
          location: {
            value: 'San Francisco, CA, USA',
          },
          autonomous_system: {
            value: 'whatevenisthis',
          },
          domain: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'test.7.com',
              },
            ],
          },
        },
        {
          key: '8.8.8.8',
          bytes_in: {
            value: 21424889,
          },
          bytes_out: {
            value: 344357,
          },
          location: {
            value: 'San Francisco, CA, USA',
          },
          autonomous_system: {
            value: 'whatevenisthis',
          },
          domain: {
            buckets: [
              {
                key: 'test.8.com',
              },
            ],
          },
        },
        {
          key: '9.9.9.9',
          bytes_in: {
            value: 19205000,
          },
          bytes_out: {
            value: 355663,
          },
          location: {
            value: 'San Francisco, CA, USA',
          },
          autonomous_system: {
            value: 'whatevenisthis',
          },
          domain: {
            buckets: [
              {
                key: 'test.9.com',
              },
            ],
          },
        },
        {
          key: '10.10.10.10',
          bytes_in: {
            value: 11407633,
          },
          bytes_out: {
            value: 199360,
          },
          location: {
            value: 'San Francisco, CA, USA',
          },
          autonomous_system: {
            value: 'whatevenisthis',
          },
          domain: {
            buckets: [
              {
                key: 'test.10.com',
              },
            ],
          },
        },
        {
          key: '11.11.11.11',
          bytes_in: {
            value: 11393327,
          },
          bytes_out: {
            value: 195914,
          },
          location: {
            value: 'San Francisco, CA, USA',
          },
          autonomous_system: {
            value: 'whatevenisthis',
          },
          domain: {
            buckets: [
              {
                key: 'test.11.com',
              },
            ],
          },
        },
      ],
    },
  },
};

export const mockTopNFlowQueryDsl = {
  mockTopNFlowQueryDsl: 'mockTopNFlowQueryDsl',
};

export const mockResult = {
  inspect: {
    dsl: [JSON.stringify(mockTopNFlowQueryDsl, null, 2)],
    response: [JSON.stringify(mockResponse, null, 2)],
  },
  edges: [
    {
      cursor: {
        tiebreaker: null,
        value: '1.1.1.1',
      },
      node: {
        _id: '1.1.1.1',
        network: {
          bytes_in: 11276023407,
          bytes_out: 1025631,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.1.net'],
          ip: '1.1.1.1',
          count: 1,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '2.2.2.2',
      },
      node: {
        _id: '2.2.2.2',
        network: {
          bytes_in: 5469323342,
          bytes_out: 2811441,
          direction: ['outbound', 'external'],
        },
        source: {
          domain: ['test.2.net'],
          ip: '2.2.2.2',
          count: 2,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '3.3.3.3',
      },
      node: {
        _id: '3.3.3.3',
        network: {
          bytes_in: 3807671322,
          bytes_out: 4494034,
          direction: ['outbound'],
        },
        source: {
          domain: ['test.3.com', 'test.3-duplicate.com'],
          ip: '3.3.3.3',
          count: 5,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '4.4.4.4',
      },
      node: {
        _id: '4.4.4.4',
        network: {
          bytes_in: 166517626,
          bytes_out: 3194782,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.4.com'],
          ip: '4.4.4.4',
          count: 1,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '5.5.5.5',
      },
      node: {
        _id: '5.5.5.5',
        network: {
          bytes_in: 104785026,
          bytes_out: 1838597,
          direction: ['external'],
        },
        source: {
          domain: ['test.5.com'],
          ip: '5.5.5.5',
          count: 3,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '6.6.6.6',
      },
      node: {
        _id: '6.6.6.6',
        network: {
          bytes_in: 28804250,
          bytes_out: 482982,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.6.com'],
          ip: '6.6.6.6',
          count: 2,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '7.7.7.7',
      },
      node: {
        _id: '7.7.7.7',
        network: {
          bytes_in: 23032363,
          bytes_out: 400623,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.7.com'],
          ip: '7.7.7.7',
          count: 2,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '8.8.8.8',
      },
      node: {
        _id: '8.8.8.8',
        network: {
          bytes_in: 21424889,
          bytes_out: 344357,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.8.com'],
          ip: '8.8.8.8',
          count: 2,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '9.9.9.9',
      },
      node: {
        _id: '9.9.9.9',
        network: {
          bytes_in: 19205000,
          bytes_out: 355663,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.9.com'],
          ip: '9.9.9.9',
          count: 2,
        },
      },
    },
    {
      cursor: {
        tiebreaker: null,
        value: '10.10.10.10',
      },
      node: {
        _id: '10.10.10.10',
        network: {
          bytes_in: 11407633,
          bytes_out: 199360,
          direction: ['inbound'],
        },
        source: {
          domain: ['test.10.com'],
          ip: '10.10.10.10',
          count: 2,
        },
      },
    },
  ],
  pageInfo: {
    activePage: 0,
    fakeTotalCount: 50,
    showMorePagesIndicator: true,
  },
  totalCount: 545,
};
