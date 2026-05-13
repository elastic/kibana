/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getAlertSnoozeSnapshot } from './get_alert_snooze_snapshot';

describe('getAlertSnoozeSnapshot', () => {
  test('searches with the correct params', async () => {
    const logger = loggingSystemMock.createLogger();
    const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await getAlertSnoozeSnapshot({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertId: 'test-alert-id',
      ruleId: 'test-rule-id',
      fields: ['host.name', 'kibana.alert.severity'],
    });

    expect(clusterClient.search).toHaveBeenCalledWith({
      index: ['test-index'],
      allow_no_indices: true,
      size: 1,
      _source: ['host.name', 'kibana.alert.severity'],
      query: {
        bool: {
          must: [
            { term: { ['kibana.alert.rule.uuid']: 'test-rule-id' } },
            { term: { ['kibana.alert.status']: 'active' } },
          ],
          filter: [{ term: { ['kibana.alert.instance.id']: 'test-alert-id' } }],
        },
      },
    });
  });

  test('returns the requested snapshot fields from the matching alert', async () => {
    const logger = loggingSystemMock.createLogger();
    const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    clusterClient.search.mockResponseOnce({
      hits: {
        total: 1,
        hits: [
          {
            _index: 'test-index',
            _id: 'test-alert-id',
            _source: {
              host: { name: 'web-01' },
              kibana: { alert: { severity: 'high' } },
            },
          },
        ],
      },
      took: 0,
      timed_out: false,
      _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
    });

    const result = await getAlertSnoozeSnapshot({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertId: 'test-alert-id',
      ruleId: 'test-rule-id',
      fields: ['host.name', 'kibana.alert.severity'],
    });

    expect(result).toEqual({
      'host.name': 'web-01',
      'kibana.alert.severity': 'high',
    });
  });

  test('returns null when the alert does not exist', async () => {
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

    const result = await getAlertSnoozeSnapshot({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertId: 'test-alert-id',
      ruleId: 'test-rule-id',
      fields: ['host.name'],
    });

    expect(result).toBeNull();
  });

  test('stores missing requested fields as null', async () => {
    const logger = loggingSystemMock.createLogger();
    const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    clusterClient.search.mockResponseOnce({
      hits: {
        total: 1,
        hits: [
          {
            _index: 'test-index',
            _id: 'test-alert-id',
            _source: {
              host: { name: 'web-01' },
            },
          },
        ],
      },
      took: 0,
      timed_out: false,
      _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
    });

    const result = await getAlertSnoozeSnapshot({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertId: 'test-alert-id',
      ruleId: 'test-rule-id',
      fields: ['host.name', 'kibana.alert.severity'],
    });

    expect(result).toEqual({
      'host.name': 'web-01',
      'kibana.alert.severity': null,
    });
  });

  test('logs an error when search fails with an Error instance', async () => {
    const logger = loggingSystemMock.createLogger();
    const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    clusterClient.search.mockRejectedValueOnce(new Error('Test error'));

    const result = await getAlertSnoozeSnapshot({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertId: 'test-alert-id',
      ruleId: 'test-rule-id',
      fields: ['host.name'],
    });

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      'Error fetching snooze snapshot for alertId: test-alert-id and ruleId: test-rule-id - Test error'
    );
  });

  test('reads field values stored as flat dot-notation keys in the alert document', async () => {
    const logger = loggingSystemMock.createLogger();
    const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    clusterClient.search.mockResponseOnce({
      hits: {
        total: 1,
        hits: [
          {
            _index: 'test-index',
            _id: 'test-alert-id',
            _source: {
              // fields stored with flat dot-notation keys (no nested objects)
              'kibana.alert.consecutive_matches': 8,
              'kibana.alert.severity': 'critical',
            },
          },
        ],
      },
      took: 0,
      timed_out: false,
      _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
    });

    const result = await getAlertSnoozeSnapshot({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertId: 'test-alert-id',
      ruleId: 'test-rule-id',
      fields: ['kibana.alert.consecutive_matches', 'kibana.alert.severity'],
    });

    expect(result).toEqual({
      'kibana.alert.consecutive_matches': 8,
      'kibana.alert.severity': 'critical',
    });
  });

  test('prefers flat dot-notation key over nested path traversal when both exist in the source', async () => {
    const logger = loggingSystemMock.createLogger();
    const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    clusterClient.search.mockResponseOnce({
      hits: {
        total: 1,
        hits: [
          {
            _index: 'test-index',
            _id: 'test-alert-id',
            _source: {
              'kibana.alert.severity': 'high',
              kibana: { alert: { severity: 'low' } },
            },
          },
        ],
      },
      took: 0,
      timed_out: false,
      _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
    });

    const result = await getAlertSnoozeSnapshot({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertId: 'test-alert-id',
      ruleId: 'test-rule-id',
      fields: ['kibana.alert.severity'],
    });

    expect(result).toEqual({ 'kibana.alert.severity': 'high' });
  });

  test('logs an error when search fails with a non-Error thrown value', async () => {
    const logger = loggingSystemMock.createLogger();
    const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    clusterClient.search.mockRejectedValueOnce('unexpected string error');

    const result = await getAlertSnoozeSnapshot({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      alertId: 'test-alert-id',
      ruleId: 'test-rule-id',
      fields: ['host.name'],
    });

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      'Error fetching snooze snapshot for alertId: test-alert-id and ruleId: test-rule-id - unexpected string error'
    );
  });
});
