/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, HostsFields } from '../../graphql/types';
import { defaultIndexPattern } from '../../../default_index_pattern';

import {
  HostOverviewRequestOptions,
  HostLastFirstSeenRequestOptions,
  HostsRequestOptions,
} from '.';

export const mockGetHostsOptions: HostsRequestOptions = {
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
  timerange: { interval: '12h', to: 1554824274610, from: 1554737874610 },
  sort: { field: HostsFields.lastSeen, direction: Direction.asc },
  pagination: {
    activePage: 0,
    cursorStart: 0,
    fakePossibleCount: 10,
    querySize: 2,
  },
  filterQuery: {},
  fields: [
    'totalCount',
    '_id',
    'host.id',
    'host.name',
    'host.os.name',
    'host.os.version',
    'edges.cursor.value',
    'pageInfo.activePage',
    'pageInfo.fakeTotalCount',
    'pageInfo.showMorePagesIndicator',
  ],
};

export const mockGetHostsRequest = {
  params: {},
  payload: {
    operationName: 'GetHostsTableQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: 1554737729201, to: 1554824129202 },
      pagination: {
        activePage: 0,
        cursorStart: 0,
        fakePossibleCount: 10,
        querySize: 2,
      },
      sort: { field: HostsFields.lastSeen, direction: Direction.asc },
      filterQuery: '',
    },
    query:
      'query GetHostsTableQuery($sourceId: ID!, $timerange: TimerangeInput!, $pagination: PaginationInput!, $sort: HostsSortField!, $filterQuery: String) {\n  source(id: $sourceId) {\n    id\n    Hosts(timerange: $timerange, pagination: $pagination, sort: $sort, filterQuery: $filterQuery) {\n      totalCount\n      edges {\n        node {\n          _id\n          host {\n            id\n            name\n            os {\n              name\n              version\n              __typename\n            }\n            __typename\n          }\n          __typename\n        }\n        cursor {\n          value\n          __typename\n        }\n        __typename\n      }\n      pageInfo {\n        endCursor {\n          value\n          __typename\n        }\n        hasNextPage\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
};

export const mockGetHostsResponse = {
  took: 1695,
  timed_out: false,
  _shards: {
    total: 59,
    successful: 59,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 4018586,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    host_data: {
      doc_count_error_upper_bound: -1,
      sum_other_doc_count: 3082125,
      buckets: [
        {
          key: 'beats-ci-immutable-centos-7-1554823376629262884',
          doc_count: 991,
          lastSeen: {
            value: 1554823916544,
            value_as_string: '2019-04-09T15:31:56.544Z',
          },
          host_os_version: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '7 (Core)',
                doc_count: 991,
                timestamp: {
                  value: 1554823916544,
                  value_as_string: '2019-04-09T15:31:56.544Z',
                },
              },
            ],
          },
          firstSeen: {
            value: 1554823396740,
            value_as_string: '2019-04-09T15:23:16.740Z',
          },
          host_os_name: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'CentOS Linux',
                doc_count: 991,
                timestamp: {
                  value: 1554823916544,
                  value_as_string: '2019-04-09T15:31:56.544Z',
                },
              },
            ],
          },
          host_name: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'beats-ci-immutable-centos-7-1554823376629262884',
                doc_count: 991,
                timestamp: {
                  value: 1554823916544,
                  value_as_string: '2019-04-09T15:31:56.544Z',
                },
              },
            ],
          },
          host_id: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f85edea1973c34f862c376cac4ebc777',
                doc_count: 991,
                timestamp: {
                  value: 1554823916544,
                  value_as_string: '2019-04-09T15:31:56.544Z',
                },
              },
            ],
          },
        },
        {
          key: 'beats-ci-immutable-centos-7-1554823376629299914',
          doc_count: 571,
          lastSeen: {
            value: 1554823916302,
            value_as_string: '2019-04-09T15:31:56.302Z',
          },
          host_os_version: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '7 (Core)',
                doc_count: 571,
                timestamp: {
                  value: 1554823916302,
                  value_as_string: '2019-04-09T15:31:56.302Z',
                },
              },
            ],
          },
          firstSeen: {
            value: 1554823398628,
            value_as_string: '2019-04-09T15:23:18.628Z',
          },
          host_os_name: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'CentOS Linux',
                doc_count: 571,
                timestamp: {
                  value: 1554823916302,
                  value_as_string: '2019-04-09T15:31:56.302Z',
                },
              },
            ],
          },
          host_name: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'beats-ci-immutable-centos-7-1554823376629299914',
                doc_count: 571,
                timestamp: {
                  value: 1554823916302,
                  value_as_string: '2019-04-09T15:31:56.302Z',
                },
              },
            ],
          },
          host_id: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f85edea1973c34f862c376cac4ebc777',
                doc_count: 571,
                timestamp: {
                  value: 1554823916302,
                  value_as_string: '2019-04-09T15:31:56.302Z',
                },
              },
            ],
          },
        },
      ],
    },
    host_count: {
      value: 1627,
    },
  },
};

export const mockGetHostsQueryDsl = { mockGetHostsQueryDsl: 'mockGetHostsQueryDsl' };

export const mockGetHostsResult = {
  inspect: {
    dsl: [JSON.stringify(mockGetHostsQueryDsl, null, 2)],
    response: [JSON.stringify(mockGetHostsResponse, null, 2)],
  },
  edges: [
    {
      node: {
        _id: 'beats-ci-immutable-centos-7-1554823376629262884',
        host: {
          id: 'f85edea1973c34f862c376cac4ebc777',
          name: 'beats-ci-immutable-centos-7-1554823376629262884',
          os: {
            name: 'CentOS Linux',
            version: '7 (Core)',
          },
        },
      },
      cursor: {
        value: 'beats-ci-immutable-centos-7-1554823376629262884',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'beats-ci-immutable-centos-7-1554823376629299914',
        host: {
          id: 'f85edea1973c34f862c376cac4ebc777',
          name: 'beats-ci-immutable-centos-7-1554823376629299914',
          os: {
            name: 'CentOS Linux',
            version: '7 (Core)',
          },
        },
      },
      cursor: {
        value: 'beats-ci-immutable-centos-7-1554823376629299914',
        tiebreaker: null,
      },
    },
  ],
  totalCount: 1627,
  pageInfo: {
    activePage: 0,
    fakeTotalCount: 10,
    showMorePagesIndicator: true,
  },
};

export const mockGetHostOverviewOptions: HostOverviewRequestOptions = {
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
  timerange: { interval: '12h', to: 1554824274610, from: 1554737874610 },
  defaultIndex: defaultIndexPattern,
  fields: [
    '_id',
    'host.architecture',
    'host.id',
    'host.ip',
    'host.mac',
    'host.name',
    'host.os.family',
    'host.os.name',
    'host.os.platform',
    'host.os.version',
    'host.os.__typename',
    'host.type',
    'host.__typename',
    'cloud.instance.id',
    'cloud.instance.__typename',
    'cloud.machine.type',
    'cloud.machine.__typename',
    'cloud.provider',
    'cloud.region',
    'cloud.__typename',
    '__typename',
  ],
  hostName: 'siem-es',
};

export const mockGetHostOverviewRequest = {
  params: {},
  payload: {
    operationName: 'GetHostOverviewQuery',
    variables: { sourceId: 'default', hostName: 'siem-es' },
    query:
      'query GetHostOverviewQuery($sourceId: ID!, $hostName: String!, $timerange: TimerangeInput!) {\n  source(id: $sourceId) {\n    id\n    HostOverview(hostName: $hostName, timerange: $timerange) {\n      _id\n      host {\n        architecture\n        id\n        ip\n        mac\n        name\n        os {\n          family\n          name\n          platform\n          version\n          __typename\n        }\n        type\n        __typename\n      }\n      cloud {\n        instance {\n          id\n          __typename\n        }\n        machine {\n          type\n          __typename\n        }\n        provider\n        region\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
};

export const mockGetHostOverviewResponse = {
  took: 2205,
  timed_out: false,
  _shards: { total: 59, successful: 59, skipped: 0, failed: 0 },
  hits: { total: { value: 611894, relation: 'eq' }, max_score: null, hits: [] },
  aggregations: {
    host_mac: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
    host_ip: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
    cloud_region: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'us-east-1',
          doc_count: 4308,
          timestamp: { value: 1556903543093, value_as_string: '2019-05-03T17:12:23.093Z' },
        },
      ],
    },
    cloud_provider: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'gce',
          doc_count: 432808,
          timestamp: { value: 1556903543093, value_as_string: '2019-05-03T17:12:23.093Z' },
        },
      ],
    },
    cloud_instance_id: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '5412578377715150143',
          doc_count: 432808,
          timestamp: { value: 1556903543093, value_as_string: '2019-05-03T17:12:23.093Z' },
        },
      ],
    },
    cloud_machine_type: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'n1-standard-1',
          doc_count: 432808,
          timestamp: { value: 1556903543093, value_as_string: '2019-05-03T17:12:23.093Z' },
        },
      ],
    },
    host_os_version: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '9 (stretch)',
          doc_count: 611894,
          timestamp: { value: 1554826117972, value_as_string: '2019-04-09T16:08:37.972Z' },
        },
      ],
    },
    host_architecture: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'x86_64',
          doc_count: 611894,
          timestamp: { value: 1554826117972, value_as_string: '2019-04-09T16:08:37.972Z' },
        },
      ],
    },
    host_os_platform: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'debian',
          doc_count: 611894,
          timestamp: { value: 1554826117972, value_as_string: '2019-04-09T16:08:37.972Z' },
        },
      ],
    },
    host_os_name: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'Debian GNU/Linux',
          doc_count: 611894,
          timestamp: { value: 1554826117972, value_as_string: '2019-04-09T16:08:37.972Z' },
        },
      ],
    },
    host_os_family: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'debian',
          doc_count: 611894,
          timestamp: { value: 1554826117972, value_as_string: '2019-04-09T16:08:37.972Z' },
        },
      ],
    },
    host_name: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'siem-es',
          doc_count: 611894,
          timestamp: { value: 1554826117972, value_as_string: '2019-04-09T16:08:37.972Z' },
        },
      ],
    },
    host_id: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'b6d5264e4b9c8880ad1053841067a4a6',
          doc_count: 611894,
          timestamp: { value: 1554826117972, value_as_string: '2019-04-09T16:08:37.972Z' },
        },
      ],
    },
  },
};

export const mockGetHostOverviewRequestDsl = {
  mockGetHostOverviewRequestDsl: 'mockGetHostOverviewRequestDsl',
};

export const mockGetHostOverviewResult = {
  inspect: {
    dsl: [JSON.stringify(mockGetHostOverviewRequestDsl, null, 2)],
    response: [JSON.stringify(mockGetHostOverviewResponse, null, 2)],
  },
  _id: 'siem-es',
  host: {
    architecture: 'x86_64',
    id: 'b6d5264e4b9c8880ad1053841067a4a6',
    ip: [],
    mac: [],
    name: 'siem-es',
    os: {
      family: 'debian',
      name: 'Debian GNU/Linux',
      platform: 'debian',
      version: '9 (stretch)',
    },
  },
  cloud: {
    instance: {
      id: ['5412578377715150143'],
    },
    machine: {
      type: ['n1-standard-1'],
    },
    provider: ['gce'],
    region: ['us-east-1'],
  },
};

export const mockGetHostLastFirstSeenOptions: HostLastFirstSeenRequestOptions = {
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
  hostName: 'siem-es',
};

export const mockGetHostLastFirstSeenRequest = {
  params: {},
  payload: {
    operationName: 'GetHostLastFirstSeenQuery',
    variables: { sourceId: 'default', hostName: 'siem-es' },
    query:
      'query GetHostLastFirstSeenQuery($sourceId: ID!, $hostName: String!) {\n  source(id: $sourceId) {\n    id\n    HostLastFirstSeen(hostName: $hostName) {\n      firstSeen\n      lastSeen\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
};

export const mockGetHostLastFirstSeenResponse = {
  took: 60,
  timed_out: false,
  _shards: {
    total: 59,
    successful: 59,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 612092,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    lastSeen: {
      value: 1554826692178,
      value_as_string: '2019-04-09T16:18:12.178Z',
    },
    firstSeen: {
      value: 1550806892826,
      value_as_string: '2019-02-22T03:41:32.826Z',
    },
  },
};

export const mockGetHostLastFirstSeenDsl = {
  mockGetHostLastFirstSeenDsl: 'mockGetHostLastFirstSeenDsl',
};

export const mockGetHostLastFirstSeenResult = {
  inspect: {
    dsl: [JSON.stringify(mockGetHostLastFirstSeenDsl, null, 2)],
    response: [JSON.stringify(mockGetHostLastFirstSeenResponse, null, 2)],
  },
  firstSeen: '2019-02-22T03:41:32.826Z',
  lastSeen: '2019-04-09T16:18:12.178Z',
};
