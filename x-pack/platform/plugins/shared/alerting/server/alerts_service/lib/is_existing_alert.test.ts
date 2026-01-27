/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isExistingAlert } from './is_existing_alert';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

describe('isExistingAlert', () => {
  test('searches with the correct params', async () => {
    const logger = loggingSystemMock.createLogger();
    const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    await isExistingAlert({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertId: 'test-alert-id',
      ruleId: 'test-rule-id',
    });

    expect(clusterClient.search).toHaveBeenCalledWith({
      index: ['test-index'],
      allow_no_indices: true,
      size: 0,
      query: {
        bool: {
          must: [{ term: { ['kibana.alert.rule.uuid']: 'test-rule-id' } }],
          filter: [{ term: { ['kibana.alert.instance.id']: 'test-alert-id' } }],
        },
      },
    });
  });

  test('returns true is the alert exists', async () => {
    const logger = loggingSystemMock.createLogger();
    const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    clusterClient.search.mockResponseOnce({
      hits: {
        total: 2,
        hits: [],
      },
      took: 0,
      timed_out: false,
      _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
    });

    const result = await isExistingAlert({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertId: 'test-alert-id',
      ruleId: 'test-rule-id',
    });

    expect(result).toBe(true);
  });

  test('returns false is the alert does not exist', async () => {
    const logger = loggingSystemMock.createLogger();
    const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    clusterClient.search.mockResponseOnce({
      hits: {
        total: 0,
        hits: [],
      },
      took: 0,
      timed_out: false,
      _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
    });

    const result = await isExistingAlert({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertId: 'test-alert-id',
      ruleId: 'test-rule-id',
    });

    expect(result).toBe(false);
  });

  test('logs an error when search fails', async () => {
    const logger = loggingSystemMock.createLogger();
    const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    clusterClient.search.mockRejectedValueOnce(new Error('Test error'));

    const result = await isExistingAlert({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertId: 'test-alert-id',
      ruleId: 'test-rule-id',
    });

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'Error checking for existing alert with alertId: test-alert-id and ruleId: test-rule-id - Test error'
    );
  });
});
