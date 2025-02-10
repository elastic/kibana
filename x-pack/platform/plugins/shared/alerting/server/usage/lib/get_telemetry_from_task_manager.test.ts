/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { MockedLogger, loggerMock } from '@kbn/logging-mocks';
import {
  getFailedAndUnrecognizedTasksPerDay,
  parseBucket,
} from './get_telemetry_from_task_manager';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;
let logger: MockedLogger;

describe('task manager telemetry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
  });

  describe('parseBucket', () => {
    test('should correctly parse aggregation bucket results', () => {
      expect(
        parseBucket([
          {
            key: 'failed',
            doc_count: 36,
            by_task_type: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'alerting:.index-threshold',
                  doc_count: 4,
                },
                {
                  key: 'alerting:document.test.',
                  doc_count: 32,
                },
              ],
            },
          },
          {
            key: 'unrecognized',
            doc_count: 4,
            by_task_type: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'alerting:logs.alert.document.count',
                  doc_count: 4,
                },
              ],
            },
          },
        ])
      ).toEqual({
        countFailedAndUnrecognizedTasksByStatus: {
          failed: 36,
          unrecognized: 4,
        },
        countFailedAndUnrecognizedTasksByStatusByType: {
          failed: {
            '__index-threshold': 4,
            document__test__: 32,
          },
          unrecognized: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 4,
          },
        },
      });
    });

    test('should handle missing values', () => {
      expect(
        parseBucket([
          {
            key: 'failed',
            by_task_type: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'alerting:.index-threshold',
                  doc_count: 4,
                },
                // @ts-expect-error
                {
                  key: 'alerting:document.test.',
                },
              ],
            },
          },
          {
            key: 'unrecognized',
            doc_count: 4,
            // @ts-expect-error
            by_task_type: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
            },
          },
          // @ts-expect-error
          {
            key: 'another_key',
          },
        ])
      ).toEqual({
        countFailedAndUnrecognizedTasksByStatus: {
          failed: 0,
          unrecognized: 4,
          another_key: 0,
        },
        countFailedAndUnrecognizedTasksByStatusByType: {
          failed: {
            '__index-threshold': 4,
            document__test__: 0,
          },
        },
      });
    });

    test('should handle empty input', () => {
      expect(parseBucket([])).toEqual({
        countFailedAndUnrecognizedTasksByStatus: {},
        countFailedAndUnrecognizedTasksByStatusByType: {},
      });
    });

    test('should handle undefined input', () => {
      // @ts-expect-error
      expect(parseBucket(undefined)).toEqual({
        countFailedAndUnrecognizedTasksByStatus: {},
        countFailedAndUnrecognizedTasksByStatusByType: {},
      });
    });
  });

  describe('getFailedAndUnrecognizedTasksPerDay', () => {
    test('should return counts of failed and unrecognized tasks broken down by status and rule type', async () => {
      esClient.search.mockResponse({
        took: 4,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 40, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: {
          by_status: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'failed',
                doc_count: 36,
                by_task_type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'alerting:.index-threshold',
                      doc_count: 4,
                    },
                    {
                      key: 'alerting:document.test.',
                      doc_count: 32,
                    },
                  ],
                },
              },
              {
                key: 'unrecognized',
                doc_count: 4,
                by_task_type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'alerting:logs.alert.document.count',
                      doc_count: 4,
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      const telemetry = await getFailedAndUnrecognizedTasksPerDay({
        esClient,
        taskManagerIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      expect(telemetry).toStrictEqual({
        countFailedAndUnrecognizedTasks: 40,
        countFailedAndUnrecognizedTasksByStatus: {
          failed: 36,
          unrecognized: 4,
        },
        countFailedAndUnrecognizedTasksByStatusByType: {
          failed: {
            '__index-threshold': 4,
            document__test__: 32,
          },
          unrecognized: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 4,
          },
        },
        hasErrors: false,
      });
    });

    test('should return empty results and log warning if query throws error', async () => {
      esClient.search.mockRejectedValue(new Error('oh no'));

      const telemetry = await getFailedAndUnrecognizedTasksPerDay({
        esClient,
        taskManagerIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      const loggerCall = logger.warn.mock.calls[0][0];
      const loggerMeta = logger.warn.mock.calls[0][1];
      expect(loggerCall as string).toMatchInlineSnapshot(
        `"Error executing alerting telemetry task: getFailedAndUnrecognizedTasksPerDay - Error: oh no"`
      );
      expect(loggerMeta?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerMeta?.error?.stack_trace).toBeDefined();
      expect(telemetry).toStrictEqual({
        errorMessage: 'oh no',
        hasErrors: true,
        countFailedAndUnrecognizedTasks: 0,
        countFailedAndUnrecognizedTasksByStatus: {},
        countFailedAndUnrecognizedTasksByStatusByType: {},
      });
    });

    test('should return empty results and log debug log if query throws search_phase_execution_exception error', async () => {
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

      const telemetry = await getFailedAndUnrecognizedTasksPerDay({
        esClient,
        taskManagerIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      const loggerCalls = loggingSystemMock.collect(logger);
      expect(loggerCalls.debug).toHaveLength(2);
      expect(loggerCalls.debug[0][0]).toEqual(
        `query for getFailedAndUnrecognizedTasksPerDay - {\"index\":\"test\",\"size\":0,\"body\":{\"query\":{\"bool\":{\"must\":[{\"bool\":{\"should\":[{\"term\":{\"task.status\":\"unrecognized\"}},{\"term\":{\"task.status\":\"failed\"}}]}},{\"wildcard\":{\"task.taskType\":{\"value\":\"alerting:*\"}}},{\"range\":{\"task.runAt\":{\"gte\":\"now-1d\"}}}]}},\"aggs\":{\"by_status\":{\"terms\":{\"field\":\"task.status\",\"size\":10},\"aggs\":{\"by_task_type\":{\"terms\":{\"field\":\"task.taskType\",\"size\":33}}}}}}}`
      );
      expect(loggerCalls.debug[1][0]).toMatchInlineSnapshot(`
        "Error executing alerting telemetry task: getFailedAndUnrecognizedTasksPerDay - ResponseError: search_phase_execution_exception
        	Caused by:
        		no_shard_available_action_exception: This is the nested reason"
      `);
      // logger meta
      expect(loggerCalls.debug[1][1]?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerCalls.debug[1][1]?.error?.stack_trace).toBeDefined();
      expect(loggerCalls.warn).toHaveLength(0);

      expect(telemetry).toStrictEqual({
        errorMessage: 'no_shard_available_action_exception',
        hasErrors: true,
        countFailedAndUnrecognizedTasks: 0,
        countFailedAndUnrecognizedTasksByStatus: {},
        countFailedAndUnrecognizedTasksByStatusByType: {},
      });
    });
  });
});
