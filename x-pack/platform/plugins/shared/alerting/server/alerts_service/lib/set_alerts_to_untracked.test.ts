/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ElasticsearchClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { ALERT_RULE_UUID, ALERT_UUID } from '@kbn/rule-data-utils';
import { setAlertsToUntracked } from './set_alerts_to_untracked';

let clusterClient: ElasticsearchClientMock;
let logger: ReturnType<(typeof loggingSystemMock)['createLogger']>;

const getAllAuthorizedRuleTypesFindOperationMock = jest.fn();
const getAlertIndicesAliasMock = jest.fn();
const ensureAuthorizedMock = jest.fn();

describe('setAlertsToUntracked()', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    const date = '2023-03-28T22:27:28.159Z';
    jest.setSystemTime(new Date(date));

    logger = loggingSystemMock.createLogger();
    clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    clusterClient.search.mockResponse({
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        hits: [],
      },
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should call updateByQuery on provided ruleIds', async () => {
    await setAlertsToUntracked({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      ruleIds: ['test-rule'],
    });

    expect(clusterClient.updateByQuery).toHaveBeenCalledTimes(1);
    expect(clusterClient.updateByQuery.mock.lastCall).toMatchInlineSnapshot(`
      Array [
        Object {
          "allow_no_indices": true,
          "body": Object {
            "conflicts": "proceed",
            "query": Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "term": Object {
                      "kibana.alert.status": Object {
                        "value": "active",
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "should": Array [
                        Object {
                          "term": Object {
                            "kibana.alert.rule.uuid": Object {
                              "value": "test-rule",
                            },
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "bool": Object {
                      "should": Array [],
                    },
                  },
                ],
              },
            },
            "script": Object {
              "lang": "painless",
              "source": "
      if (!ctx._source.containsKey('kibana.alert.status') || ctx._source['kibana.alert.status'].empty) {
        ctx._source.kibana.alert.status = 'untracked';
        ctx._source.kibana.alert.end = '2023-03-28T22:27:28.159Z';
        ctx._source.kibana.alert.time_range.lte = '2023-03-28T22:27:28.159Z';
      } else {
        ctx._source['kibana.alert.status'] = 'untracked';
        ctx._source['kibana.alert.end'] = '2023-03-28T22:27:28.159Z';
        ctx._source['kibana.alert.time_range'].lte = '2023-03-28T22:27:28.159Z';
      }",
            },
          },
          "index": Array [
            "test-index",
          ],
          "refresh": true,
        },
      ]
    `);
  });

  test('should call updateByQuery on provided alertUuids', async () => {
    await setAlertsToUntracked({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertUuids: ['test-alert'],
    });

    expect(clusterClient.updateByQuery).toHaveBeenCalledTimes(1);
    expect(clusterClient.updateByQuery.mock.lastCall).toMatchInlineSnapshot(`
      Array [
        Object {
          "allow_no_indices": true,
          "body": Object {
            "conflicts": "proceed",
            "query": Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "term": Object {
                      "kibana.alert.status": Object {
                        "value": "active",
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "should": Array [],
                    },
                  },
                  Object {
                    "bool": Object {
                      "should": Array [
                        Object {
                          "term": Object {
                            "kibana.alert.uuid": Object {
                              "value": "test-alert",
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            "script": Object {
              "lang": "painless",
              "source": "
      if (!ctx._source.containsKey('kibana.alert.status') || ctx._source['kibana.alert.status'].empty) {
        ctx._source.kibana.alert.status = 'untracked';
        ctx._source.kibana.alert.end = '2023-03-28T22:27:28.159Z';
        ctx._source.kibana.alert.time_range.lte = '2023-03-28T22:27:28.159Z';
      } else {
        ctx._source['kibana.alert.status'] = 'untracked';
        ctx._source['kibana.alert.end'] = '2023-03-28T22:27:28.159Z';
        ctx._source['kibana.alert.time_range'].lte = '2023-03-28T22:27:28.159Z';
      }",
            },
          },
          "index": Array [
            "test-index",
          ],
          "refresh": true,
        },
      ]
    `);
  });

  test('should retry updateByQuery on failure', async () => {
    clusterClient.updateByQuery.mockResponseOnce({
      total: 10,
      updated: 8,
    });

    await setAlertsToUntracked({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      ruleIds: ['test-rule'],
    });

    expect(clusterClient.updateByQuery).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      'Attempt 1: Failed to untrack 2 of 10; indices test-index, ruleIds test-rule'
    );
  });

  describe('ensureAuthorized', () => {
    test('should fail on siem consumer', async () => {
      clusterClient.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          hits: [],
        },
        aggregations: {
          ruleTypeIds: {
            buckets: [
              {
                key: 'some rule type',
                consumers: {
                  buckets: [
                    {
                      key: 'not siem',
                    },
                    {
                      key: 'definitely not siem',
                    },
                    {
                      key: 'hey guess what still not siem',
                    },
                    {
                      key: 'siem',
                    },
                    {
                      key: 'uh oh was that siem',
                    },
                    {
                      key: 'not good',
                    },
                    {
                      key: 'this is gonna fail',
                    },
                  ],
                },
              },
            ],
          },
        },
      });
      await expect(
        setAlertsToUntracked({
          logger,
          esClient: clusterClient,
          indices: ['test-index'],
          ruleIds: ['test-rule'],
          ensureAuthorized: () => Promise.resolve(),
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Untracking Security alerts is not permitted"`);
    });

    test('should fail on unauthorized consumer', async () => {
      clusterClient.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          hits: [],
        },
        aggregations: {
          ruleTypeIds: {
            buckets: [
              {
                key: 'some rule',
                consumers: {
                  buckets: [
                    {
                      key: 'authorized',
                    },
                    {
                      key: 'unauthorized',
                    },
                  ],
                },
              },
            ],
          },
        },
      });
      await expect(
        setAlertsToUntracked({
          logger,
          esClient: clusterClient,
          indices: ['test-index'],
          ruleIds: ['test-rule'],
          ensureAuthorized: async ({ consumer }) => {
            if (consumer === 'unauthorized') throw new Error('Unauthorized consumer');
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unauthorized consumer"`);
    });
  });

  test('should succeed when all consumers are authorized', async () => {
    clusterClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        hits: [],
      },
      aggregations: {
        ruleTypeIds: {
          buckets: [
            {
              key: 'some rule',
              consumers: {
                buckets: [
                  {
                    key: 'authorized',
                  },
                  {
                    key: 'still authorized',
                  },
                  {
                    key: 'even this one is authorized',
                  },
                ],
              },
            },
          ],
        },
      },
    });
    await expect(
      setAlertsToUntracked({
        logger,
        esClient: clusterClient,
        indices: ['test-index'],
        ruleIds: ['test-rule'],
        ensureAuthorized: async ({ consumer }) => {
          if (consumer === 'unauthorized') throw new Error('Unauthorized consumer');
        },
      })
    ).resolves;
  });

  test('should untrack by query', async () => {
    getAllAuthorizedRuleTypesFindOperationMock.mockResolvedValue(
      new Map([
        [
          'test-rule-type',
          {
            id: 'test-rule-type',
          },
        ],
      ])
    );
    getAlertIndicesAliasMock.mockResolvedValue(['test-alert-index']);

    clusterClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        hits: [],
      },
      aggregations: {
        ruleTypeIds: {
          buckets: [
            {
              key: 'some rule type',
              consumers: {
                buckets: [{ key: 'o11y' }],
              },
            },
          ],
        },
      },
    });

    clusterClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        hits: [
          {
            _index: 'test-alert-index',
            _id: 'test-alert-id-1',
            _source: {
              [ALERT_RULE_UUID]: 'test-alert-rule-id-1',
              [ALERT_UUID]: 'test-alert-id-1',
            },
          },
          {
            _index: 'test-alert-index',
            _id: 'test-alert-id-2',
            _source: {
              [ALERT_RULE_UUID]: 'test-alert-rule-id-2',
              [ALERT_UUID]: 'test-alert-id-2',
            },
          },
        ],
      },
    });

    clusterClient.updateByQuery.mockResponseOnce({ total: 2, updated: 2 });

    const result = await setAlertsToUntracked({
      isUsingQuery: true,
      query: [
        {
          bool: {
            must: {
              term: {
                'kibana.alert.rule.name': 'test',
              },
            },
          },
        },
      ],
      ruleTypeIds: ['my-rule-type-id'],
      spaceId: 'default',
      getAllAuthorizedRuleTypesFindOperation: getAllAuthorizedRuleTypesFindOperationMock,
      getAlertIndicesAlias: getAlertIndicesAliasMock,
      ensureAuthorized: ensureAuthorizedMock,
      logger,
      esClient: clusterClient,
    });

    expect(getAlertIndicesAliasMock).lastCalledWith(['test-rule-type'], 'default');

    expect(clusterClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          query: {
            bool: {
              must: [
                {
                  term: {
                    'kibana.alert.status': {
                      value: 'active', // This has to be active
                    },
                  },
                },
              ],
              filter: [
                {
                  bool: {
                    must: {
                      term: {
                        'kibana.alert.rule.name': 'test',
                      },
                    },
                  },
                },
              ],
            },
          },
        }),
      })
    );

    expect(clusterClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          query: {
            bool: {
              must: [
                {
                  term: {
                    'kibana.alert.status': {
                      value: 'untracked', // This has to be untracked
                    },
                  },
                },
              ],
              filter: [
                {
                  bool: {
                    must: {
                      term: {
                        'kibana.alert.rule.name': 'test',
                      },
                    },
                  },
                },
              ],
            },
          },
        }),
      })
    );

    expect(result).toEqual([
      {
        'kibana.alert.rule.uuid': 'test-alert-rule-id-1',
        'kibana.alert.uuid': 'test-alert-id-1',
      },
      {
        'kibana.alert.rule.uuid': 'test-alert-rule-id-2',
        'kibana.alert.uuid': 'test-alert-id-2',
      },
    ]);
  });

  test('should return an empty array if the search returns zero results', async () => {
    getAllAuthorizedRuleTypesFindOperationMock.mockResolvedValue(
      new Map([
        [
          'test-rule-type',
          {
            id: 'test-rule-type',
          },
        ],
      ])
    );
    getAlertIndicesAliasMock.mockResolvedValue(['test-alert-index']);

    clusterClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        hits: [],
      },
      aggregations: {
        ruleTypeIds: {
          buckets: [
            {
              key: 'some rule type',
              consumers: {
                buckets: [{ key: 'o11y' }],
              },
            },
          ],
        },
      },
    });

    clusterClient.updateByQuery.mockResponseOnce({ total: 0, updated: 0 });

    const result = await setAlertsToUntracked({
      isUsingQuery: true,
      query: [
        {
          bool: {
            must: {
              term: {
                'kibana.alert.rule.name': 'test',
              },
            },
          },
        },
      ],
      ruleTypeIds: ['my-rule-type-id'],
      spaceId: 'default',
      getAllAuthorizedRuleTypesFindOperation: getAllAuthorizedRuleTypesFindOperationMock,
      getAlertIndicesAlias: getAlertIndicesAliasMock,
      ensureAuthorized: ensureAuthorizedMock,
      logger,
      esClient: clusterClient,
    });

    expect(getAlertIndicesAliasMock).lastCalledWith(['test-rule-type'], 'default');

    expect(clusterClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          query: {
            bool: {
              must: [
                {
                  term: {
                    'kibana.alert.status': {
                      value: 'active', // This has to be active
                    },
                  },
                },
              ],
              filter: [
                {
                  bool: {
                    must: {
                      term: {
                        'kibana.alert.rule.name': 'test',
                      },
                    },
                  },
                },
              ],
            },
          },
        }),
      })
    );

    expect(clusterClient.search).not.toHaveBeenCalledWith();
    expect(result).toEqual([]);
  });
});
