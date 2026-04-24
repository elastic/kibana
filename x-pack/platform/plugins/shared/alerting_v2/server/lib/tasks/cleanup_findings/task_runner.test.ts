/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { RULE_DOCTOR_FINDINGS_INDEX } from '../../../resources/indices/rule_doctor_findings';
import { FindingsCleanupTaskRunner } from './task_runner';
import { CLEANUP_FINDINGS_TASK_INTERVAL, CLEANUP_FINDINGS_RETENTION_DAYS } from './task_definition';

describe('FindingsCleanupTaskRunner', () => {
  let esClient: DeeplyMockedApi<ElasticsearchClient>;
  const logger = loggingSystemMock.createLogger();
  let runner: FindingsCleanupTaskRunner;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.deleteByQuery.mockResolvedValue({ deleted: 0 });
    runner = new FindingsCleanupTaskRunner(logger, esClient);
  });

  it('calls deleteByQuery with the correct index, statuses, and retention window', async () => {
    esClient.deleteByQuery.mockResolvedValue({ deleted: 5 });

    await runner.run({
      taskInstance: { state: { runs: 0, total_deleted: 0 } } as never,
      abortController: new AbortController(),
    });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: RULE_DOCTOR_FINDINGS_INDEX,
      query: {
        bool: {
          filter: [
            { terms: { status: ['dismissed', 'applied'] } },
            { range: { '@timestamp': { lt: `now-${CLEANUP_FINDINGS_RETENTION_DAYS}d` } } },
          ],
        },
      },
      refresh: true,
    });
  });

  it('returns updated state with deleted count on success', async () => {
    esClient.deleteByQuery.mockResolvedValue({ deleted: 7 });

    const result = await runner.run({
      taskInstance: { state: { runs: 2, total_deleted: 10 } } as never,
      abortController: new AbortController(),
    });

    expect(result).toEqual({
      state: { runs: 3, total_deleted: 17 },
      schedule: { interval: CLEANUP_FINDINGS_TASK_INTERVAL },
    });
  });

  it('logs info when findings are deleted', async () => {
    esClient.deleteByQuery.mockResolvedValue({ deleted: 3 });

    await runner.run({
      taskInstance: { state: { runs: 0, total_deleted: 0 } } as never,
      abortController: new AbortController(),
    });

    expect(logger.info).toHaveBeenCalledWith(
      `Cleaned up 3 stale findings from ${RULE_DOCTOR_FINDINGS_INDEX}`
    );
  });

  it('logs debug when no findings are deleted', async () => {
    esClient.deleteByQuery.mockResolvedValue({ deleted: 0 });

    await runner.run({
      taskInstance: { state: { runs: 0, total_deleted: 0 } } as never,
      abortController: new AbortController(),
    });

    expect(logger.debug).toHaveBeenCalledWith('No stale findings to clean up');
  });

  it('handles errors gracefully and returns state with schedule', async () => {
    esClient.deleteByQuery.mockRejectedValue(new Error('index_not_found_exception'));

    const result = await runner.run({
      taskInstance: { state: { runs: 1, total_deleted: 5 } } as never,
      abortController: new AbortController(),
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Error executing findings cleanup task: index_not_found_exception',
      expect.any(Object)
    );
    expect(result).toEqual({
      state: { runs: 2, total_deleted: 5 },
      schedule: { interval: CLEANUP_FINDINGS_TASK_INTERVAL },
    });
  });

  it('handles undefined deleted count in response', async () => {
    esClient.deleteByQuery.mockResolvedValue({ deleted: undefined } as never);

    const result = await runner.run({
      taskInstance: { state: { runs: 0, total_deleted: 0 } } as never,
      abortController: new AbortController(),
    });

    expect(result).toEqual({
      state: { runs: 1, total_deleted: 0 },
      schedule: { interval: CLEANUP_FINDINGS_TASK_INTERVAL },
    });
    expect(logger.debug).toHaveBeenCalledWith('No stale findings to clean up');
  });
});
