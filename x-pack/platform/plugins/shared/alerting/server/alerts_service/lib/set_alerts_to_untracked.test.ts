/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_UUID,
  SPACE_IDS,
} from '@kbn/rule-data-utils';
import { setAlertsToUntracked } from './set_alerts_to_untracked';

let clusterClient: ElasticsearchClientMock;
let logger: ReturnType<(typeof loggingSystemMock)['createLogger']>;

const getAllAuthorizedRuleTypesFindOperationMock = jest.fn();
const getAlertIndicesAliasMock = jest.fn();
const bulkEnsureAuthorizedMock = jest.fn();

const mockSearchResponseBase = {
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { hits: [] },
};

const mockAuthorizedPairsFilter = {
  bool: {
    should: [
      {
        bool: {
          filter: [
            { term: { [ALERT_RULE_TYPE_ID]: 'some rule type' } },
            { terms: { [ALERT_RULE_CONSUMER]: ['o11y'] } },
          ],
        },
      },
    ],
    minimum_should_match: 1,
  },
};

describe('setAlertsToUntracked()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          "conflicts": "proceed",
          "index": Array [
            "test-index",
          ],
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
          "refresh": true,
          "script": Object {
            "lang": "painless",
            "source": "
      if (!ctx._source.containsKey('kibana.alert.status') || ctx._source['kibana.alert.status'].empty) {
        ctx._source.kibana.alert.status = 'untracked';
        ctx._source.kibana.alert.end = '2023-03-28T22:27:28.159Z';
        ctx._source.kibana.alert.time_range.lte = '2023-03-28T22:27:28.159Z';
        ctx._source.kibana.alert.tracked = false;
      } else {
        ctx._source['kibana.alert.status'] = 'untracked';
        ctx._source['kibana.alert.end'] = '2023-03-28T22:27:28.159Z';
        ctx._source['kibana.alert.time_range'].lte = '2023-03-28T22:27:28.159Z';
        ctx._source['kibana.alert.tracked'] = false;
      }",
          },
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
          "conflicts": "proceed",
          "index": Array [
            "test-index",
          ],
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
          "refresh": true,
          "script": Object {
            "lang": "painless",
            "source": "
      if (!ctx._source.containsKey('kibana.alert.status') || ctx._source['kibana.alert.status'].empty) {
        ctx._source.kibana.alert.status = 'untracked';
        ctx._source.kibana.alert.end = '2023-03-28T22:27:28.159Z';
        ctx._source.kibana.alert.time_range.lte = '2023-03-28T22:27:28.159Z';
        ctx._source.kibana.alert.tracked = false;
      } else {
        ctx._source['kibana.alert.status'] = 'untracked';
        ctx._source['kibana.alert.end'] = '2023-03-28T22:27:28.159Z';
        ctx._source['kibana.alert.time_range'].lte = '2023-03-28T22:27:28.159Z';
        ctx._source['kibana.alert.tracked'] = false;
      }",
          },
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

  describe('bulkEnsureAuthorized', () => {
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
          bulkEnsureAuthorized: () => Promise.resolve(),
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
          bulkEnsureAuthorized: async ({ ruleTypeIdConsumersPairs }) => {
            const hasUnauthorized = ruleTypeIdConsumersPairs.some((p) =>
              p.consumers.includes('unauthorized')
            );
            if (hasUnauthorized) throw new Error('Unauthorized consumer');
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
        bulkEnsureAuthorized: async ({ ruleTypeIdConsumersPairs }) => {
          const hasUnauthorized = ruleTypeIdConsumersPairs.some((p) =>
            p.consumers.includes('unauthorized')
          );
          if (hasUnauthorized) throw new Error('Unauthorized consumer');
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
      bulkEnsureAuthorized: bulkEnsureAuthorizedMock,
      logger,
      esClient: clusterClient,
    });

    expect(getAlertIndicesAliasMock).toHaveBeenLastCalledWith(['test-rule-type'], 'default');

    // The authorization search must run on the same indices as the update
    expect(clusterClient.search.mock.calls[0][0]).toMatchObject({
      index: ['test-alert-index'],
    });

    expect(clusterClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ['test-alert-index'],
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
                terms: {
                  [SPACE_IDS]: ['default'],
                },
              },
              mockAuthorizedPairsFilter,
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
      })
    );

    expect(clusterClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
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
                terms: {
                  [SPACE_IDS]: ['default'],
                },
              },
              mockAuthorizedPairsFilter,
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
      bulkEnsureAuthorized: bulkEnsureAuthorizedMock,
      logger,
      esClient: clusterClient,
    });

    expect(getAlertIndicesAliasMock).toHaveBeenLastCalledWith(['test-rule-type'], 'default');

    expect(clusterClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
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
                terms: {
                  [SPACE_IDS]: ['default'],
                },
              },
              mockAuthorizedPairsFilter,
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
      })
    );

    expect(clusterClient.search).not.toHaveBeenCalledWith();
    expect(result).toEqual([]);
  });

  describe('authorization aggregation', () => {
    const mockManyRuleTypeBuckets = Array.from({ length: 11 }, (_, index) => ({
      key: `rule-type-${index}`,
      consumers: { buckets: [{ key: 'o11y' }] },
    }));

    test('should request enough buckets to cover every rule type and consumer', async () => {
      clusterClient.search.mockResponseOnce({
        ...mockSearchResponseBase,
        aggregations: { ruleTypeIds: { buckets: mockManyRuleTypeBuckets } },
      });

      await setAlertsToUntracked({
        logger,
        esClient: clusterClient,
        indices: ['test-index'],
        alertUuids: ['test-alert-uuid'],
        bulkEnsureAuthorized: bulkEnsureAuthorizedMock,
      });

      expect(clusterClient.search.mock.calls[0][0]).toMatchObject({
        aggs: {
          ruleTypeIds: {
            terms: { field: ALERT_RULE_TYPE_ID, size: 1000 },
            aggs: { consumers: { terms: { field: ALERT_RULE_CONSUMER, size: 100 } } },
          },
        },
      });
      expect(bulkEnsureAuthorizedMock).toHaveBeenCalledWith({
        ruleTypeIdConsumersPairs: mockManyRuleTypeBuckets.map(({ key }) => ({
          ruleTypeId: key,
          consumers: ['o11y'],
        })),
      });
    });

    test('should fail closed when some rule types are left out of the aggregation', async () => {
      clusterClient.search.mockResponseOnce({
        ...mockSearchResponseBase,
        aggregations: {
          ruleTypeIds: { sum_other_doc_count: 1, buckets: mockManyRuleTypeBuckets },
        },
      });

      await expect(
        setAlertsToUntracked({
          logger,
          esClient: clusterClient,
          indices: ['test-index'],
          alertUuids: ['test-alert-uuid'],
          bulkEnsureAuthorized: bulkEnsureAuthorizedMock,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to authorize untracking: too many rule types or consumers matched"`
      );
      expect(bulkEnsureAuthorizedMock).not.toHaveBeenCalled();
      expect(clusterClient.updateByQuery).not.toHaveBeenCalled();
    });

    test('should fail closed when some consumers are left out of the aggregation', async () => {
      clusterClient.search.mockResponseOnce({
        ...mockSearchResponseBase,
        aggregations: {
          ruleTypeIds: {
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'some rule type',
                consumers: { sum_other_doc_count: 1, buckets: [{ key: 'o11y' }] },
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
          alertUuids: ['test-alert-uuid'],
          bulkEnsureAuthorized: bulkEnsureAuthorizedMock,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to authorize untracking: too many rule types or consumers matched"`
      );
      expect(bulkEnsureAuthorizedMock).not.toHaveBeenCalled();
      expect(clusterClient.updateByQuery).not.toHaveBeenCalled();
    });

    test('should fail on a siem consumer even when it is not among the first 10 rule types', async () => {
      clusterClient.search.mockResponseOnce({
        ...mockSearchResponseBase,
        aggregations: {
          ruleTypeIds: {
            buckets: [
              ...mockManyRuleTypeBuckets,
              { key: 'siem.notifications', consumers: { buckets: [{ key: 'siem' }] } },
            ],
          },
        },
      });

      await expect(
        setAlertsToUntracked({
          logger,
          esClient: clusterClient,
          indices: ['test-index'],
          alertUuids: ['test-alert-uuid'],
          bulkEnsureAuthorized: bulkEnsureAuthorizedMock,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Untracking Security alerts is not permitted"`);
      expect(clusterClient.updateByQuery).not.toHaveBeenCalled();
    });

    test('should only update and return alerts of the authorized rule type and consumer pairs', async () => {
      clusterClient.search.mockResponseOnce({
        ...mockSearchResponseBase,
        aggregations: {
          ruleTypeIds: {
            buckets: [{ key: 'some rule type', consumers: { buckets: [{ key: 'o11y' }] } }],
          },
        },
      });
      clusterClient.updateByQuery.mockResponseOnce({ total: 1, updated: 1 });

      await setAlertsToUntracked({
        logger,
        esClient: clusterClient,
        indices: ['test-index'],
        alertUuids: ['test-alert-uuid'],
        spaceId: 'space1',
        bulkEnsureAuthorized: bulkEnsureAuthorizedMock,
      });

      const expectedFilter = [{ terms: { [SPACE_IDS]: ['space1'] } }, mockAuthorizedPairsFilter];
      expect(clusterClient.updateByQuery.mock.lastCall![0].query).toMatchObject({
        bool: { filter: expectedFilter },
      });
      expect(clusterClient.search.mock.lastCall![0]).toMatchObject({
        query: { bool: { filter: expectedFilter } },
      });
    });

    test('should skip the update when no active alerts matched', async () => {
      clusterClient.search.mockResponseOnce({
        ...mockSearchResponseBase,
        aggregations: { ruleTypeIds: { buckets: [] } },
      });

      const result = await setAlertsToUntracked({
        logger,
        esClient: clusterClient,
        indices: ['test-index'],
        alertUuids: ['test-alert-uuid'],
        bulkEnsureAuthorized: bulkEnsureAuthorizedMock,
      });

      expect(result).toEqual([]);
      expect(clusterClient.updateByQuery).not.toHaveBeenCalled();
    });

    test('should not limit the update to authorized pairs when no authorization is required', async () => {
      await setAlertsToUntracked({
        logger,
        esClient: clusterClient,
        indices: ['test-index'],
        ruleIds: ['test-rule'],
      });

      const query = clusterClient.updateByQuery.mock.lastCall![0].query as {
        bool: { filter?: unknown };
      };
      expect(query.bool.filter).toBeUndefined();
    });
  });

  describe('space isolation (direct UUID path)', () => {
    test('should include space filter in updateByQuery when spaceId is provided', async () => {
      await setAlertsToUntracked({
        logger,
        esClient: clusterClient,
        indices: ['test-index'],
        alertUuids: ['test-alert-uuid'],
        spaceId: 'space1',
      });

      expect(clusterClient.updateByQuery).toHaveBeenCalledTimes(1);
      expect(clusterClient.updateByQuery.mock.lastCall![0].query).toMatchObject({
        bool: {
          must: expect.any(Array),
          filter: [
            {
              terms: {
                [SPACE_IDS]: ['space1'],
              },
            },
          ],
        },
      });
    });

    test('should include space filter in authorization search when spaceId is provided', async () => {
      clusterClient.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { hits: [] },
        aggregations: {
          ruleTypeIds: {
            buckets: [{ key: 'some-rule', consumers: { buckets: [{ key: 'o11y' }] } }],
          },
        },
      });

      await setAlertsToUntracked({
        logger,
        esClient: clusterClient,
        indices: ['test-index'],
        alertUuids: ['test-alert-uuid'],
        spaceId: 'space1',
        bulkEnsureAuthorized: bulkEnsureAuthorizedMock,
      });

      // First search is for authorization aggregation
      expect(clusterClient.search.mock.calls[0][0]).toMatchObject({
        query: {
          bool: {
            must: expect.any(Array),
            filter: [
              {
                terms: {
                  [SPACE_IDS]: ['space1'],
                },
              },
            ],
          },
        },
      });
    });

    test('should not include space filter when spaceId is absent', async () => {
      await setAlertsToUntracked({
        logger,
        esClient: clusterClient,
        indices: ['test-index'],
        alertUuids: ['test-alert-uuid'],
      });

      const query = clusterClient.updateByQuery.mock.lastCall![0].query as {
        bool: { filter?: unknown };
      };
      expect(query.bool.filter).toBeUndefined();
    });

    test('should include space filter in post-update search when spaceId is provided', async () => {
      clusterClient.updateByQuery.mockResponseOnce({ total: 1, updated: 1 });

      await setAlertsToUntracked({
        logger,
        esClient: clusterClient,
        indices: ['test-index'],
        alertUuids: ['test-alert-uuid'],
        spaceId: 'space1',
      });

      // The search after update should also carry the space filter
      expect(clusterClient.search.mock.lastCall![0]).toMatchObject({
        query: {
          bool: {
            must: expect.any(Array),
            filter: [
              {
                terms: {
                  [SPACE_IDS]: ['space1'],
                },
              },
            ],
          },
        },
      });
    });

    test('should NOT include the all-spaces wildcard in the space filter', async () => {
      // Untracking must never match globally visible ('*') alerts (e.g. internally managed
      // Streams "Significant Events" alerts). Only the caller's own space is allowed.
      await setAlertsToUntracked({
        logger,
        esClient: clusterClient,
        indices: ['test-index'],
        alertUuids: ['test-alert-uuid'],
        spaceId: 'space1',
      });

      const query = clusterClient.updateByQuery.mock.lastCall![0].query as {
        bool: { filter: Array<{ terms: Record<string, string[]> }> };
      };
      expect(query.bool.filter[0].terms[SPACE_IDS]).toEqual(['space1']);
      expect(query.bool.filter[0].terms[SPACE_IDS]).not.toContain('*');
    });
  });
});
