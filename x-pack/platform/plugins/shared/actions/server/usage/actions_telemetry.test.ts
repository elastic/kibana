/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { MockedLogger, loggerMock } from '@kbn/logging-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { errors } from '@elastic/elasticsearch';
import {
  getCounts,
  getExecutionsPerDayCount,
  getInUseTotalCount,
  getTotalCount,
} from './actions_telemetry';

let logger: MockedLogger;

describe('actions telemetry', () => {
  beforeEach(() => {
    logger = loggerMock.create();
  });

  test('getTotalCount should replace first symbol . to __ for action types names', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponse(
      // @ts-expect-error not full search response
      {
        aggregations: {
          byActionTypeId: {
            buckets: [
              { key: '.index', doc_count: 1 },
              { key: '.server-log', doc_count: 1 },
              { key: 'some.type', doc_count: 1 },
              { key: 'another.type.', doc_count: 1 },
            ],
          },
        },
        hits: {
          hits: [
            {
              _id: 'action:541efb3d-f82a-4d2c-a5c3-636d1ce49b53',
              _index: '.kibana_1',
              _score: 0,
              _source: {
                action: {
                  actionTypeId: '.index',
                  config: {
                    index: 'kibana_sample_data_ecommerce',
                    refresh: true,
                    executionTimeField: null,
                  },
                  name: 'test',
                  secrets:
                    'UPyn6cit6zBTPMmldfKh/8S2JWypwaLhhEQWBXp+OyTc6TtLHOnW92wehCqTq1FhIY3vA8hwVsggj+tbIoCcfPArpzP5SO7hh8vd6pY13x5TkiM083UgjjaAxbPvKQ==',
                },
                references: [],
                type: 'action',
                updated_at: '2020-03-26T18:46:44.449Z',
              },
            },
            {
              _id: 'action:00000000-f82a-4d2c-a5c3-636d1ce49b53',
              _index: '.kibana_1',
              _score: 0,
              _source: {
                action: {
                  actionTypeId: '.server-log',
                  config: {},
                  name: 'test server log',
                  secrets: '',
                },
                references: [],
                type: 'action',
                updated_at: '2020-03-26T18:46:44.449Z',
              },
            },
            {
              _id: 'action:00000000-1',
              _index: '.kibana_1',
              _score: 0,
              _source: {
                action: {
                  actionTypeId: 'some.type',
                  config: {},
                  name: 'test type',
                  secrets: {},
                },
                references: [],
                type: 'action',
                updated_at: '2020-03-26T18:46:44.449Z',
              },
            },
            {
              _id: 'action:00000000-2',
              _index: '.kibana_1',
              _score: 0,
              _source: {
                action: {
                  actionTypeId: 'another.type.',
                  config: {},
                  name: 'test another type',
                  secrets: {},
                },
                references: [],
                type: 'action',
                updated_at: '2020-03-26T18:46:44.449Z',
              },
            },
          ],
        },
      }
    );
    const telemetry = await getTotalCount(mockEsClient, 'test', logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "countByType": Object {
          "__index": 1,
          "__server-log": 1,
          "another.type__": 1,
          "some.type": 1,
        },
        "countGenAiProviderTypes": Object {},
        "countTotal": 4,
        "hasErrors": false,
      }
    `);
  });

  test('getTotalCount should return empty results and log warning if query throws error', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockRejectedValue(new Error('oh no'));

    const telemetry = await getTotalCount(mockEsClient, 'test', logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    const loggerCalls = loggingSystemMock.collect(logger);
    expect(loggerCalls.debug).toHaveLength(0);
    expect(loggerCalls.warn).toHaveLength(1);
    expect(loggerCalls.warn[0][0]).toEqual(
      `Error executing actions telemetry task: getTotalCount - Error: oh no`
    );
    // logger meta
    expect(loggerCalls.warn[0][1]?.tags).toEqual(['actions', 'telemetry-failed']);
    expect(loggerCalls.warn[0][1]?.error?.stack_trace).toBeDefined();

    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "countByType": Object {},
        "countGenAiProviderTypes": Object {},
        "countTotal": 0,
        "errorMessage": "oh no",
        "hasErrors": true,
      }
    `);
  });

  test('getTotalCount should return empty results and log debug if query throws search_phase_execution_exception error', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockRejectedValueOnce(
      new errors.ResponseError({
        warnings: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: {} as any,
        body: {
          error: {
            root_cause: [],
            type: 'search_phase_execution_exception',
            reason: 'no_shard_available_action_exception',
            phase: 'fetch',
            grouped: true,
            failed_shards: [],
            caused_by: {
              type: 'no_shard_available_action_exception',
              reason: 'This is the nested reason',
            },
          },
        },
        statusCode: 503,
        headers: {},
      })
    );

    const telemetry = await getTotalCount(mockEsClient, 'test', logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    const loggerCalls = loggingSystemMock.collect(logger);
    expect(loggerCalls.debug).toHaveLength(1);
    expect(loggerCalls.debug[0][0]).toMatchInlineSnapshot(`
      "Error executing actions telemetry task: getTotalCount - ResponseError: search_phase_execution_exception
      	Caused by:
      		no_shard_available_action_exception: This is the nested reason"
    `);
    // logger meta
    expect(loggerCalls.debug[0][1]?.tags).toEqual(['actions', 'telemetry-failed']);
    expect(loggerCalls.debug[0][1]?.error?.stack_trace).toBeDefined();

    expect(loggerCalls.warn).toHaveLength(0);

    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "countByType": Object {},
        "countGenAiProviderTypes": Object {},
        "countTotal": 0,
        "errorMessage": "no_shard_available_action_exception",
        "hasErrors": true,
      }
    `);
  });

  test('getInUseTotalCount', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
        aggregations: {
          refs: {
            actionRefIds: {
              buckets: [
                {
                  key: ['1', 'action-0'],
                  key_as_string: '1|action-0',
                  doc_count: 1,
                },
                {
                  key: ['123', 'action-0'],
                  key_as_string: '123|action-0',
                  doc_count: 1,
                },
              ],
            },
          },
          hits: {
            hits: [],
          },
        },
      }
    );

    mockEsClient.search.mockResponse({
      hits: {
        hits: [
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '1',
                actionTypeId: '.server-log',
              },
              namespaces: ['default'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '2',
                actionTypeId: '.slack',
              },
              namespaces: ['default'],
            },
          },
        ],
      },
    });
    const telemetry = await getInUseTotalCount(mockEsClient, 'test', logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "countByAlertHistoryConnectorType": 0,
        "countByType": Object {
          "__server-log": 1,
          "__slack": 1,
        },
        "countEmailByService": Object {},
        "countNamespaces": 1,
        "countTotal": 2,
        "hasErrors": false,
      }
    `);
  });

  test('getInUseTotalCount should count preconfigured alert history connector usage', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
        aggregations: {
          refs: {
            actionRefIds: {
              buckets: [
                {
                  key: ['1', 'action_0'],
                  key_as_string: '1|action_0',
                  doc_count: 1,
                },
                {
                  key: ['123', 'action_1'],
                  key_as_string: '123|action_1',
                  doc_count: 1,
                },
                {
                  key: ['preconfigured-alert-history-es-index', 'action_2'],
                  key_as_string: 'preconfigured-alert-history-es-index|action_2',
                  doc_count: 1,
                },
              ],
            },
          },
          actions: {
            actionRefIds: {
              buckets: [
                {
                  key: ['preconfigured:preconfigured-alert-history-es-index', '.index'],
                  key_as_string: 'preconfigured:preconfigured-alert-history-es-index|.index',
                  doc_count: 1,
                },
              ],
            },
          },
        },
      }
    );
    mockEsClient.search.mockResponseOnce({
      hits: {
        hits: [
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '1',
                actionTypeId: '.server-log',
              },
              namespaces: ['default'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '2',
                actionTypeId: '.slack',
              },
              namespaces: ['default'],
            },
          },
        ],
      },
    });
    const telemetry = await getInUseTotalCount(mockEsClient, 'test', logger, undefined, [
      {
        id: 'test',
        actionTypeId: '.email',
        name: 'test',
        isPreconfigured: true,
        isDeprecated: false,
        isSystemAction: false,
        config: {
          tenantId: 'sdsd',
          clientId: 'sdfsdf',
        },
        secrets: {
          clientSecret: 'sdfsdf',
        },
      },
      {
        id: 'anotherServerLog',
        actionTypeId: '.server-log',
        name: 'test',
        isPreconfigured: true,
        isDeprecated: false,
        isSystemAction: false,
        secrets: {},
        config: {},
      },
    ]);

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "countByAlertHistoryConnectorType": 1,
        "countByType": Object {
          "__index": 1,
          "__server-log": 1,
          "__slack": 1,
        },
        "countEmailByService": Object {},
        "countNamespaces": 1,
        "countTotal": 4,
        "hasErrors": false,
      }
    `);
  });

  test('getInUseTotalCount should return empty results and log warning if query throws error', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockRejectedValue(new Error('oh no'));

    const telemetry = await getInUseTotalCount(mockEsClient, 'test', logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    const loggerCalls = loggingSystemMock.collect(logger);
    expect(loggerCalls.debug).toHaveLength(0);
    expect(loggerCalls.warn).toHaveLength(1);
    expect(loggerCalls.warn[0][0]).toEqual(
      `Error executing actions telemetry task: getInUseTotalCount - Error: oh no`
    );
    // logger meta
    expect(loggerCalls.warn[0][1]?.tags).toEqual(['actions', 'telemetry-failed']);
    expect(loggerCalls.warn[0][1]?.error?.stack_trace).toBeDefined();

    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "countByAlertHistoryConnectorType": 0,
        "countByType": Object {},
        "countEmailByService": Object {},
        "countNamespaces": 0,
        "countTotal": 0,
        "errorMessage": "oh no",
        "hasErrors": true,
      }
    `);
  });

  test('getInUseTotalCount should return empty results and log debug if query throws search_phase_execution_exception error', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockRejectedValueOnce(
      new errors.ResponseError({
        warnings: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: {} as any,
        body: {
          error: {
            root_cause: [],
            type: 'search_phase_execution_exception',
            reason: 'no_shard_available_action_exception',
            phase: 'fetch',
            grouped: true,
            failed_shards: [],
            caused_by: {
              type: 'no_shard_available_action_exception',
              reason: 'This is the nested reason',
            },
          },
        },
        statusCode: 503,
        headers: {},
      })
    );

    const telemetry = await getInUseTotalCount(mockEsClient, 'test', logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    const loggerCalls = loggingSystemMock.collect(logger);
    expect(loggerCalls.debug).toHaveLength(1);
    expect(loggerCalls.debug[0][0]).toMatchInlineSnapshot(`
      "Error executing actions telemetry task: getInUseTotalCount - ResponseError: search_phase_execution_exception
      	Caused by:
      		no_shard_available_action_exception: This is the nested reason"
    `);
    // logger meta
    expect(loggerCalls.debug[0][1]?.tags).toEqual(['actions', 'telemetry-failed']);
    expect(loggerCalls.debug[0][1]?.error?.stack_trace).toBeDefined();

    expect(loggerCalls.warn).toHaveLength(0);

    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "countByAlertHistoryConnectorType": 0,
        "countByType": Object {},
        "countEmailByService": Object {},
        "countNamespaces": 0,
        "countTotal": 0,
        "errorMessage": "no_shard_available_action_exception",
        "hasErrors": true,
      }
    `);
  });

  test('getTotalCount accounts for preconfigured connectors', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponse(
      // @ts-expect-error not full search response
      {
        aggregations: {
          byActionTypeId: {
            buckets: [
              { key: '.index', doc_count: 1 },
              { key: '.server-log', doc_count: 1 },
              { key: 'some.type', doc_count: 1 },
              { key: 'another.type.', doc_count: 1 },
            ],
          },
        },
        hits: {
          hits: [
            {
              _id: 'action:541efb3d-f82a-4d2c-a5c3-636d1ce49b53',
              _index: '.kibana_1',
              _score: 0,
              _source: {
                action: {
                  actionTypeId: '.index',
                  config: {
                    index: 'kibana_sample_data_ecommerce',
                    refresh: true,
                    executionTimeField: null,
                  },
                  name: 'test',
                  secrets:
                    'UPyn6cit6zBTPMmldfKh/8S2JWypwaLhhEQWBXp+OyTc6TtLHOnW92wehCqTq1FhIY3vA8hwVsggj+tbIoCcfPArpzP5SO7hh8vd6pY13x5TkiM083UgjjaAxbPvKQ==',
                },
                references: [],
                type: 'action',
                updated_at: '2020-03-26T18:46:44.449Z',
              },
            },
            {
              _id: 'action:00000000-f82a-4d2c-a5c3-636d1ce49b53',
              _index: '.kibana_1',
              _score: 0,
              _source: {
                action: {
                  actionTypeId: '.server-log',
                  config: {},
                  name: 'test server log',
                  secrets: '',
                },
                references: [],
                type: 'action',
                updated_at: '2020-03-26T18:46:44.449Z',
              },
            },
            {
              _id: 'action:00000000-1',
              _index: '.kibana_1',
              _score: 0,
              _source: {
                action: {
                  actionTypeId: 'some.type',
                  config: {},
                  name: 'test type',
                  secrets: {},
                },
                references: [],
                type: 'action',
                updated_at: '2020-03-26T18:46:44.449Z',
              },
            },
            {
              _id: 'action:00000000-2',
              _index: '.kibana_1',
              _score: 0,
              _source: {
                action: {
                  actionTypeId: 'another.type.',
                  config: {},
                  name: 'test another type',
                  secrets: {},
                },
                references: [],
                type: 'action',
                updated_at: '2020-03-26T18:46:44.449Z',
              },
            },
          ],
        },
      }
    );
    const telemetry = await getTotalCount(mockEsClient, 'test', logger, [
      {
        id: 'test',
        actionTypeId: '.test',
        name: 'test',
        isPreconfigured: true,
        isDeprecated: false,
        isSystemAction: false,
        secrets: {},
        config: {},
      },
      {
        id: 'anotherServerLog',
        actionTypeId: '.server-log',
        name: 'test',
        isPreconfigured: true,
        isDeprecated: false,
        isSystemAction: false,
        secrets: {},
        config: {},
      },
    ]);

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "countByType": Object {
          "__index": 1,
          "__server-log": 2,
          "__test": 1,
          "another.type__": 1,
          "some.type": 1,
        },
        "countGenAiProviderTypes": Object {},
        "countTotal": 6,
        "hasErrors": false,
      }
    `);
  });

  test('getTotalCount accounts for system connectors', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponse(
      // @ts-expect-error not full search response
      {
        aggregations: {
          byActionTypeId: {
            buckets: [],
          },
        },
        hits: {
          hits: [],
        },
      }
    );
    const telemetry = await getTotalCount(mockEsClient, 'test', logger, [
      {
        id: 'system_action:system-connector-test.system-action',
        actionTypeId: 'test.system-action',
        name: 'System connector',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: true,
        secrets: {},
        config: {},
      },
    ]);

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "countByType": Object {
          "test.system-action": 1,
        },
        "countGenAiProviderTypes": Object {},
        "countTotal": 1,
        "hasErrors": false,
      }
    `);
  });

  test('getInUseTotalCount() accounts for preconfigured connectors', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
        aggregations: {
          refs: {
            actionRefIds: {
              buckets: [
                {
                  key: ['1', 'action-0'],
                  key_as_string: '1|action-0',
                  doc_count: 1,
                },
                {
                  key: ['123', 'action-1'],
                  key_as_string: '123|action-1',
                  doc_count: 1,
                },
                {
                  key: ['456', 'action-2'],
                  key_as_string: '456|action-2',
                  doc_count: 1,
                },
              ],
            },
          },
          actions: {
            actionRefIds: {
              buckets: [
                {
                  key: ['preconfigured:preconfigured-alert-history-es-index', '.index'],
                  key_as_string: 'preconfigured:preconfigured-alert-history-es-index|.index',
                  doc_count: 1,
                },
                {
                  key: ['preconfigured:cloud_email', '.email'],
                  key_as_string: 'preconfigured:cloud_email|.email',
                  doc_count: 1,
                },
                {
                  key: ['preconfigured:cloud_email2', '.email'],
                  key_as_string: 'preconfigured:cloud_email2|.email',
                  doc_count: 1,
                },
              ],
            },
          },
        },
      }
    );
    mockEsClient.search.mockResponseOnce({
      hits: {
        hits: [
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '1',
                actionTypeId: '.server-log',
              },
              namespaces: ['default'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '2',
                actionTypeId: '.slack',
              },
              namespaces: ['default'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '3',
                actionTypeId: '.email',
              },
              namespaces: ['default'],
            },
          },
        ],
      },
    });
    const telemetry = await getInUseTotalCount(mockEsClient, 'test', logger, undefined, [
      {
        id: 'anotherServerLog',
        actionTypeId: '.server-log',
        name: 'test',
        isPreconfigured: true,
        isDeprecated: false,
        isSystemAction: false,
        secrets: {},
        config: {},
      },
    ]);

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "countByAlertHistoryConnectorType": 1,
        "countByType": Object {
          "__email": 3,
          "__index": 1,
          "__server-log": 1,
          "__slack": 1,
        },
        "countEmailByService": Object {
          "other": 3,
        },
        "countNamespaces": 1,
        "countTotal": 6,
        "hasErrors": false,
      }
    `);
  });

  test('getInUseTotalCount() accounts for system connectors', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
        aggregations: {
          refs: {
            actionRefIds: {
              buckets: [
                {
                  key: ['1', 'action-0'],
                  key_as_string: '1|action-0',
                  doc_count: 1,
                },
                {
                  key: ['2', 'action-1'],
                  key_as_string: '2|action-1',
                  doc_count: 2,
                },
              ],
            },
          },
          actions: {
            actionRefIds: {
              buckets: [
                {
                  key: ['system_action:system-connector-test.system-action', 'test.system-action'],
                  key_as_string:
                    'system_action:system-connector-test.system-action|test.system-action',
                  doc_count: 1,
                },
                {
                  key: [
                    'system_action:system-connector-test.system-action-2',
                    'test.system-action-2',
                  ],
                  key_as_string:
                    'system_action:system-connector-test.system-action-2|test.system-action-2',
                  doc_count: 1,
                },
              ],
            },
          },
        },
      }
    );
    mockEsClient.search.mockResponseOnce({
      hits: {
        hits: [
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '1',
                actionTypeId: '.index',
              },
              namespaces: ['default'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '2',
                actionTypeId: '.index',
              },
              namespaces: ['default'],
            },
          },
        ],
      },
    });

    const telemetry = await getInUseTotalCount(mockEsClient, 'test', logger, undefined, []);

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "countByAlertHistoryConnectorType": 0,
        "countByType": Object {
          "__index": 2,
          "test.system-action": 1,
          "test.system-action-2": 1,
        },
        "countEmailByService": Object {},
        "countNamespaces": 1,
        "countTotal": 4,
        "hasErrors": false,
      }
    `);
  });

  test('getInUseTotalCount() accounts for actions namespaces', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
        aggregations: {
          refs: {
            actionRefIds: {
              buckets: [
                {
                  key: ['1', 'action-0'],
                  key_as_string: '1|action-0',
                  doc_count: 1,
                },
                {
                  key: ['123', 'action-1'],
                  key_as_string: '123|action-1',
                  doc_count: 1,
                },
                {
                  key: ['456', 'action-2'],
                  key_as_string: '456|action-2',
                  doc_count: 1,
                },
              ],
            },
          },
          actions: {
            actionRefIds: {
              buckets: [
                {
                  key: ['preconfigured:preconfigured-alert-history-es-index', '.index'],
                  key_as_string: 'preconfigured:preconfigured-alert-history-es-index|.index',
                  doc_count: 1,
                },
                {
                  key: ['preconfigured:cloud_email', '.email'],
                  key_as_string: 'preconfigured:cloud_email|.email',
                  doc_count: 1,
                },
                {
                  key: ['preconfigured:cloud_email2', '.email'],
                  key_as_string: 'preconfigured:cloud_email2|.email',
                  doc_count: 1,
                },
              ],
            },
          },
        },
      }
    );
    mockEsClient.search.mockResponseOnce({
      hits: {
        hits: [
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '1',
                actionTypeId: '.server-log',
              },
              namespaces: ['test'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '2',
                actionTypeId: '.slack',
              },
              namespaces: ['default'],
            },
          },
          // @ts-expect-error not full search response
          {
            _source: {
              action: {
                id: '3',
                actionTypeId: '.email',
              },
              namespaces: ['test2'],
            },
          },
        ],
      },
    });
    const telemetry = await getInUseTotalCount(mockEsClient, 'test', logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "countByAlertHistoryConnectorType": 1,
        "countByType": Object {
          "__email": 3,
          "__index": 1,
          "__server-log": 1,
          "__slack": 1,
        },
        "countEmailByService": Object {
          "other": 1,
        },
        "countNamespaces": 3,
        "countTotal": 6,
        "hasErrors": false,
      }
    `);
  });

  test('getExecutionsTotalCount', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
        aggregations: {
          totalExecutions: {
            refs: {
              byConnectorTypeId: {
                buckets: [
                  {
                    key: '.server-log',
                    doc_count: 20,
                  },
                  {
                    key: '.slack',
                    doc_count: 100,
                  },
                ],
              },
            },
          },
          failedExecutions: {
            actionSavedObjects: {
              refs: {
                byConnectorTypeId: {
                  buckets: [
                    {
                      key: '.slack',
                      doc_count: 7,
                    },
                  ],
                },
              },
            },
          },
          avgDuration: { value: 10 },
          avgDurationByType: {
            doc_count: 216,
            actionSavedObjects: {
              doc_count: 108,
              byTypeId: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: '.server-log',
                    doc_count: 99,
                    refs: {
                      doc_count: 99,
                      avgDuration: {
                        value: 919191.9191919192,
                      },
                    },
                  },
                  {
                    key: '.email',
                    doc_count: 9,
                    refs: {
                      doc_count: 9,
                      avgDuration: {
                        value: 4.196666666666667e8,
                      },
                    },
                  },
                ],
              },
            },
          },
          count_connector_types_by_action_run_outcome_per_day: {
            actionSavedObjects: {
              connector_types: {
                buckets: [
                  {
                    key: '.slack',
                    outcome: {
                      count: {
                        buckets: [
                          { key: 'success', doc_count: 12 },
                          { key: 'failure', doc_count: 1 },
                        ],
                      },
                    },
                  },
                  {
                    key: '.email',
                    outcome: {
                      count: {
                        buckets: [
                          { key: 'success', doc_count: 13 },
                          { key: 'failure', doc_count: 2 },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      }
    );

    // for .slack connectors
    mockEsClient.search.mockResponseOnce(
      // @ts-expect-error not full search response
      {
        aggregations: {
          avgDuration: { value: 10 },
        },
      }
    );
    const telemetry = await getExecutionsPerDayCount(mockEsClient, 'test', logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(telemetry).toStrictEqual({
      avgExecutionTime: 0,
      avgExecutionTimeByType: {
        '__server-log': 919191.9191919192,
        __email: 419666666.6666667,
      },

      countByType: {
        __slack: 100,

        '__server-log': 20,
      },
      countFailed: 7,
      countFailedByType: {
        __slack: 7,
      },
      countTotal: 120,
      countRunOutcomeByConnectorType: {
        __email: {
          failure: 2,
          success: 13,
        },
        __slack: {
          failure: 1,
          success: 12,
        },
      },
      hasErrors: false,
    });
  });

  test('getExecutionsPerDayCount should return empty results and log warning if query throws error', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockRejectedValue(new Error('oh no'));

    const telemetry = await getExecutionsPerDayCount(mockEsClient, 'test', logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    const loggerCalls = loggingSystemMock.collect(logger);
    expect(loggerCalls.debug).toHaveLength(0);
    expect(loggerCalls.warn).toHaveLength(1);
    expect(loggerCalls.warn[0][0]).toEqual(
      `Error executing actions telemetry task: getExecutionsPerDayCount - Error: oh no`
    );
    // logger meta
    expect(loggerCalls.warn[0][1]?.tags).toEqual(['actions', 'telemetry-failed']);
    expect(loggerCalls.warn[0][1]?.error?.stack_trace).toBeDefined();

    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "avgExecutionTime": 0,
        "avgExecutionTimeByType": Object {},
        "countByType": Object {},
        "countFailed": 0,
        "countFailedByType": Object {},
        "countRunOutcomeByConnectorType": Object {},
        "countTotal": 0,
        "errorMessage": "oh no",
        "hasErrors": true,
      }
    `);
  });

  test('getExecutionsPerDayCount should return empty results and log debug if query throws search_phase_execution_exception error', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockRejectedValueOnce(
      new errors.ResponseError({
        warnings: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: {} as any,
        body: {
          error: {
            root_cause: [],
            type: 'search_phase_execution_exception',
            reason: 'no_shard_available_action_exception',
            phase: 'fetch',
            grouped: true,
            failed_shards: [],
            caused_by: {
              type: 'no_shard_available_action_exception',
              reason: 'This is the nested reason',
            },
          },
        },
        statusCode: 503,
        headers: {},
      })
    );

    const telemetry = await getExecutionsPerDayCount(mockEsClient, 'test', logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    const loggerCalls = loggingSystemMock.collect(logger);
    expect(loggerCalls.debug).toHaveLength(1);
    expect(loggerCalls.debug[0][0]).toMatchInlineSnapshot(`
      "Error executing actions telemetry task: getExecutionsPerDayCount - ResponseError: search_phase_execution_exception
      	Caused by:
      		no_shard_available_action_exception: This is the nested reason"
    `);
    // logger meta
    expect(loggerCalls.debug[0][1]?.tags).toEqual(['actions', 'telemetry-failed']);
    expect(loggerCalls.debug[0][1]?.error?.stack_trace).toBeDefined();

    expect(loggerCalls.warn).toHaveLength(0);

    expect(telemetry).toMatchInlineSnapshot(`
      Object {
        "avgExecutionTime": 0,
        "avgExecutionTimeByType": Object {},
        "countByType": Object {},
        "countFailed": 0,
        "countFailedByType": Object {},
        "countRunOutcomeByConnectorType": Object {},
        "countTotal": 0,
        "errorMessage": "no_shard_available_action_exception",
        "hasErrors": true,
      }
    `);
  });

  it('getCounts', () => {
    const aggs = {
      '.d3security': 2,
      '.gen-ai__Azure OpenAI': 3,
      '.gen-ai__OpenAI': 1,
      '.gen-ai__Other': 1,
    };
    const { countByType, countGenAiProviderTypes } = getCounts(aggs);
    expect(countByType).toEqual({
      __d3security: 2,
      '__gen-ai': 5,
    });
    expect(countGenAiProviderTypes).toEqual({
      'Azure OpenAI': 3,
      OpenAI: 1,
      Other: 1,
    });
  });
});
