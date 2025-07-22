/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { errors } from '@elastic/elasticsearch';
import { getBackfillTelemetryPerDay } from './get_backfill_telemetry';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;
let logger: MockedLogger;

describe('backfill telemetry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
  });

  describe('getBackfillTelemetryPerDay', () => {
    test('should return counts of backfill executions and gap stats', async () => {
      esClient.search.mockResponseOnce({
        took: 4,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 8, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: {
          by_execution_status: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'success', doc_count: 6 },
              { key: 'failure', doc_count: 2 },
            ],
          },
        },
      });

      esClient.search.mockResponseOnce({
        took: 4,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 1, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: {
          total_unfilled_duration_ms: { value: 2203673 },
          total_filled_duration_ms: { value: 454245 },
        },
      });

      const telemetry = await getBackfillTelemetryPerDay({
        esClient,
        eventLogIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(2);

      expect(telemetry).toStrictEqual({
        countExecutions: 8,
        countBackfillsByExecutionStatus: {
          success: 6,
          failure: 2,
        },
        countGaps: 1,
        totalUnfilledGapDurationMs: 2203673,
        totalFilledGapDurationMs: 454245,
        hasErrors: false,
      });
    });

    test('should handle empty results', async () => {
      esClient.search.mockResponseOnce({
        took: 4,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: {
          by_execution_status: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
      });

      esClient.search.mockResponseOnce({
        took: 4,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: {
          total_unfilled_duration_ms: { value: 0 },
          total_filled_duration_ms: { value: 0 },
        },
      });

      const telemetry = await getBackfillTelemetryPerDay({
        esClient,
        eventLogIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(2);

      expect(telemetry).toStrictEqual({
        countExecutions: 0,
        countBackfillsByExecutionStatus: {},
        countGaps: 0,
        totalUnfilledGapDurationMs: 0,
        totalFilledGapDurationMs: 0,
        hasErrors: false,
      });
    });

    test('should return empty results and log warning if query throws error', async () => {
      esClient.search.mockRejectedValueOnce(new Error('oh no'));
      esClient.search.mockResponseOnce({
        took: 4,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 1, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: {
          total_unfilled_duration_ms: { value: 2203673 },
          total_filled_duration_ms: { value: 454245 },
        },
      });

      const telemetry = await getBackfillTelemetryPerDay({
        esClient,
        eventLogIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(2);

      const loggerCall = logger.warn.mock.calls[0][0];
      const loggerMeta = logger.warn.mock.calls[0][1];
      expect(loggerCall as string).toMatchInlineSnapshot(
        `"Error executing alerting telemetry task: getBackfillExecutionCount - Error: oh no"`
      );
      expect(loggerMeta?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerMeta?.error?.stack_trace).toBeDefined();
      expect(telemetry).toStrictEqual({
        hasErrors: true,
        errorMessage: 'oh no',
        countExecutions: 0,
        countBackfillsByExecutionStatus: {},
        countGaps: 1,
        totalUnfilledGapDurationMs: 2203673,
        totalFilledGapDurationMs: 454245,
      });
    });

    it('should return empty results and log debug log if query throws search_phase_execution_exception error', async () => {
      esClient.search.mockResponseOnce({
        took: 4,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 8, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: {
          by_execution_status: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'success', doc_count: 6 },
              { key: 'failure', doc_count: 2 },
            ],
          },
        },
      });
      esClient.search.mockRejectedValueOnce(
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

      const telemetry = await getBackfillTelemetryPerDay({
        esClient,
        eventLogIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(2);

      const loggerCalls = loggingSystemMock.collect(logger);
      expect(loggerCalls.debug).toHaveLength(1);
      expect(loggerCalls.debug[0][0]).toMatchInlineSnapshot(`
        "Error executing alerting telemetry task: getGapInfo - ResponseError: search_phase_execution_exception
        	Caused by:
        		no_shard_available_action_exception: This is the nested reason"
      `);
      // logger meta
      expect(loggerCalls.debug[0][1]?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerCalls.debug[0][1]?.error?.stack_trace).toBeDefined();
      expect(loggerCalls.warn).toHaveLength(0);

      expect(telemetry).toStrictEqual({
        hasErrors: true,
        errorMessage: 'no_shard_available_action_exception',
        countExecutions: 8,
        countBackfillsByExecutionStatus: {
          success: 6,
          failure: 2,
        },
        countGaps: 0,
        totalUnfilledGapDurationMs: 0,
        totalFilledGapDurationMs: 0,
      });
    });
  });
});
