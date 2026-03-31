/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getErrorSource, TaskErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { executeStatsEsqlRequest } from './execute_stats_esql_request';

describe('executeStatsEsqlRequest', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  const esqlRequest = {
    query:
      'FROM logs | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes), service = service.name | WHERE errors > 10 | LIMIT 1000',
    filter: { match_all: {} },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns structured rows with bucket, columns, and groupEntries', async () => {
    esClient.esql.query.mockResolvedValueOnce({
      columns: [
        { name: 'errors', type: 'long' },
        { name: 'bucket', type: 'date' },
        { name: 'service', type: 'keyword' },
      ],
      values: [
        [150, '2024-01-01T10:00:00.000Z', 'api-server'],
        [200, '2024-01-01T10:05:00.000Z', 'web-frontend'],
      ],
    } as never);

    const results = await executeStatsEsqlRequest({ esClient, esqlRequest, logger });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      bucket: '2024-01-01T10:00:00.000Z',
      columns: {
        errors: 150,
        bucket: '2024-01-01T10:00:00.000Z',
        service: 'api-server',
      },
      groupEntries: { service: 'api-server' },
    });
    expect(results[1].bucket).toBe('2024-01-01T10:05:00.000Z');
    expect(results[1].groupEntries).toEqual({ service: 'web-frontend' });
  });

  it('returns null bucket for non-bucketed STATS queries', async () => {
    esClient.esql.query.mockResolvedValueOnce({
      columns: [
        { name: 'errors', type: 'long' },
        { name: 'service', type: 'keyword' },
      ],
      values: [[150, 'api-server']],
    } as never);

    const results = await executeStatsEsqlRequest({ esClient, esqlRequest, logger });

    expect(results[0].bucket).toBeNull();
    expect(results[0].groupEntries).toEqual({ service: 'api-server' });
  });

  it('returns empty array when no rows are returned', async () => {
    esClient.esql.query.mockResolvedValueOnce({
      columns: [
        { name: 'errors', type: 'long' },
        { name: 'bucket', type: 'date' },
      ],
      values: [],
    } as never);

    const results = await executeStatsEsqlRequest({ esClient, esqlRequest, logger });
    expect(results).toEqual([]);
  });

  it('returns empty array when columns are empty', async () => {
    esClient.esql.query.mockResolvedValueOnce({
      columns: [],
      values: [],
    } as never);

    const results = await executeStatsEsqlRequest({ esClient, esqlRequest, logger });
    expect(results).toEqual([]);
  });

  it('uses type heuristic for group detection when groupColumnNames is not provided', async () => {
    esClient.esql.query.mockResolvedValueOnce({
      columns: [
        { name: 'error_count', type: 'long' },
        { name: 'avg_duration', type: 'double' },
        { name: 'bucket', type: 'date' },
        { name: 'host', type: 'keyword' },
      ],
      values: [[100, 250.5, '2024-01-01T10:00:00.000Z', 'host-1']],
    } as never);

    const results = await executeStatsEsqlRequest({ esClient, esqlRequest, logger });

    expect(results[0].groupEntries).toEqual({ host: 'host-1' });
  });

  it('uses explicit groupColumnNames to identify group columns including numeric ones', async () => {
    esClient.esql.query.mockResolvedValueOnce({
      columns: [
        { name: 'error_count', type: 'long' },
        { name: 'bucket', type: 'date' },
        { name: 'status_code', type: 'long' },
        { name: 'host', type: 'keyword' },
      ],
      values: [[100, '2024-01-01T10:00:00.000Z', 502, 'host-1']],
    } as never);

    const results = await executeStatsEsqlRequest({
      esClient,
      esqlRequest,
      logger,
      groupColumnNames: ['host', 'status_code'],
    });

    expect(results[0].groupEntries).toEqual({ host: 'host-1', status_code: 502 });
  });

  it('sorts groupEntries by column name for deterministic hashing', async () => {
    esClient.esql.query.mockResolvedValueOnce({
      columns: [
        { name: 'count', type: 'long' },
        { name: 'bucket', type: 'date' },
        { name: 'zone', type: 'keyword' },
        { name: 'app', type: 'keyword' },
      ],
      values: [[50, '2024-01-01T10:00:00.000Z', 'us-east', 'api']],
    } as never);

    const results = await executeStatsEsqlRequest({
      esClient,
      esqlRequest,
      logger,
      groupColumnNames: ['zone', 'app'],
    });

    expect(Object.keys(results[0].groupEntries)).toEqual(['app', 'zone']);
  });

  it('throws a user error when the ES|QL query fails', async () => {
    esClient.esql.query.mockRejectedValueOnce(new Error('query error'));

    try {
      await executeStatsEsqlRequest({ esClient, esqlRequest, logger });
      fail('Expected to throw');
    } catch (e) {
      const error = e as Error;
      expect(error.message).toContain('Error executing STATS ES|QL request');
      expect(getErrorSource(error)).toBe(TaskErrorSource.USER);
    }
  });
});
