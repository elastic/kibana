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

import { RULE_DOCTOR_INSIGHTS_INDEX } from '../../../resources/indices/rule_doctor_insights';
import { InsightsCleanupTaskRunner } from './task_runner';
import { CLEANUP_INSIGHTS_TASK_INTERVAL, CLEANUP_INSIGHTS_RETENTION_DAYS } from './task_definition';

describe('InsightsCleanupTaskRunner', () => {
  let esClient: DeeplyMockedApi<ElasticsearchClient>;
  const logger = loggingSystemMock.createLogger();
  let runner: InsightsCleanupTaskRunner;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.deleteByQuery.mockResolvedValue({ deleted: 0 });
    runner = new InsightsCleanupTaskRunner(logger, esClient);
  });

  it('calls deleteByQuery with the correct index, statuses, and retention window', async () => {
    esClient.deleteByQuery.mockResolvedValue({ deleted: 5 });

    await runner.run({
      taskInstance: { state: {} } as never,
      abortController: new AbortController(),
    });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: RULE_DOCTOR_INSIGHTS_INDEX,
      query: {
        bool: {
          filter: [
            { terms: { status: ['dismissed', 'applied'] } },
            { range: { '@timestamp': { lt: `now-${CLEANUP_INSIGHTS_RETENTION_DAYS}d` } } },
          ],
        },
      },
      conflicts: 'proceed',
      slices: 'auto',
    });
  });

  it('returns empty state with schedule on success', async () => {
    esClient.deleteByQuery.mockResolvedValue({ deleted: 7 });

    const result = await runner.run({
      taskInstance: { state: {} } as never,
      abortController: new AbortController(),
    });

    expect(result).toEqual({
      state: {},
      schedule: { interval: CLEANUP_INSIGHTS_TASK_INTERVAL },
    });
  });

  it('logs debug when insights are deleted', async () => {
    esClient.deleteByQuery.mockResolvedValue({ deleted: 3 });

    await runner.run({
      taskInstance: { state: {} } as never,
      abortController: new AbortController(),
    });

    expect(logger.debug).toHaveBeenCalledWith(
      `Cleaned up 3 stale insights from ${RULE_DOCTOR_INSIGHTS_INDEX}`
    );
  });

  it('logs debug when no insights are deleted', async () => {
    esClient.deleteByQuery.mockResolvedValue({ deleted: 0 });

    await runner.run({
      taskInstance: { state: {} } as never,
      abortController: new AbortController(),
    });

    expect(logger.debug).toHaveBeenCalledWith('No stale insights to clean up');
  });

  it('handles errors gracefully and returns state with schedule', async () => {
    esClient.deleteByQuery.mockRejectedValue(new Error('index_not_found_exception'));

    const result = await runner.run({
      taskInstance: { state: {} } as never,
      abortController: new AbortController(),
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Error executing insights cleanup task: index_not_found_exception',
      expect.any(Object)
    );
    expect(result).toEqual({
      state: {},
      schedule: { interval: CLEANUP_INSIGHTS_TASK_INTERVAL },
    });
  });

  it('handles undefined deleted count in response', async () => {
    esClient.deleteByQuery.mockResolvedValue({ deleted: undefined } as never);

    const result = await runner.run({
      taskInstance: { state: {} } as never,
      abortController: new AbortController(),
    });

    expect(result).toEqual({
      state: {},
      schedule: { interval: CLEANUP_INSIGHTS_TASK_INTERVAL },
    });
    expect(logger.debug).toHaveBeenCalledWith('No stale insights to clean up');
  });
});
