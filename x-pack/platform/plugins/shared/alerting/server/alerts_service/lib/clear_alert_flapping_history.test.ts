/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { clearAlertFlappingHistory } from './clear_alert_flapping_history';
import { ALERT_UUID } from '@kbn/rule-data-utils';

let clusterClient: ElasticsearchClientMock;
let logger: ReturnType<(typeof loggingSystemMock)['createLogger']>;

describe('clearAlertFlappingHistory()', () => {
  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    clusterClient.updateByQuery.mockResponse({
      total: 1,
      updated: 1,
    });

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
        hits: [
          {
            _index: 'test-index',
            _source: {
              [ALERT_UUID]: 'test-alert-id',
            },
          },
        ],
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should call updateByQuery with provided rule id and index', async () => {
    await clearAlertFlappingHistory({
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
                  "bool": Object {
                    "should": Array [
                      Object {
                        "term": Object {
                          "kibana.alert.status": Object {
                            "value": "active",
                          },
                        },
                      },
                      Object {
                        "term": Object {
                          "kibana.alert.status": Object {
                            "value": "recovered",
                          },
                        },
                      },
                    ],
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
              ],
            },
          },
          "refresh": true,
          "script": Object {
            "lang": "painless",
            "source": "
                  ctx._source['kibana.alert.flapping'] = false;
                  ctx._source['kibana.alert.flapping_history'] = new ArrayList();
                ",
          },
        },
      ]
    `);
  });

  test('should throw if either indices or ruleIds is empty', async () => {
    await expect(
      clearAlertFlappingHistory({
        logger,
        esClient: clusterClient,
        indices: [],
        ruleIds: ['test-rule'],
      })
    ).rejects.toThrow('Rule Ids and indices must be provided');

    await expect(
      clearAlertFlappingHistory({
        logger,
        esClient: clusterClient,
        indices: ['test-index'],
        ruleIds: [],
      })
    ).rejects.toThrow('Rule Ids and indices must be provided');

    expect(clusterClient.updateByQuery).toHaveBeenCalledTimes(0);
  });

  test('should throw if could not clear flapping history', async () => {
    clusterClient.updateByQuery.mockRejectedValue(Error('something went wrong!'));
    await expect(
      clearAlertFlappingHistory({
        logger,
        esClient: clusterClient,
        indices: ['test-index'],
        ruleIds: ['test-rule'],
      })
    ).rejects.toThrow('something went wrong!');

    expect(clusterClient.updateByQuery).toHaveBeenCalledTimes(1);

    expect(logger.error).toHaveBeenCalledWith(
      'Error clearing alert flapping for indices: test-index, ruleIds: test-rule - something went wrong!'
    );
  });

  test('should retry updateByQuery if it does not finish in 1 attempt', async () => {
    clusterClient.updateByQuery.mockResolvedValueOnce({
      total: 3,
      updated: 1,
    });
    clusterClient.updateByQuery.mockResolvedValueOnce({
      total: 3,
      updated: 2,
    });
    clusterClient.updateByQuery.mockResolvedValueOnce({
      total: 3,
      updated: 3,
    });

    await clearAlertFlappingHistory({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      ruleIds: ['test-rule'],
    });

    expect(clusterClient.updateByQuery).toHaveBeenCalledTimes(3);
  });
});
