/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { getTotalCountAggregations } from './get_telemetry_from_kibana';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;
let logger: MockedLogger;

describe('kibana alerting cases index telemetry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
  });

  describe('getTotalCountAggregations', () => {
    test('should correctly return counts parsed from query results', async () => {
      esClient.search.mockResponseOnce({
        took: 4,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 5, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: {
          by_job_type: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'printable_pdf_v2', doc_count: 2 },
              { key: 'PNGV2', doc_count: 1 },
              { key: 'csv_searchsource', doc_count: 1 },
              { key: 'csv_v2', doc_count: 1 },
            ],
          },
          enabled: {
            doc_count: 4,
            by_job_type: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'printable_pdf_v2', doc_count: 2 },
                { key: 'csv_searchsource', doc_count: 1 },
                { key: 'csv_v2', doc_count: 1 },
              ],
            },
          },
          has_notifications: { doc_count: 3 },
        },
      });

      const telemetry = await getTotalCountAggregations({ esClient, index: 'test', logger });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(esClient.search).toHaveBeenCalledWith({
        aggs: {
          by_job_type: { terms: { field: 'scheduled_report.jobType', size: 20 } },
          enabled: {
            aggs: { by_job_type: { terms: { field: 'scheduled_report.jobType', size: 20 } } },
            filter: { term: { 'scheduled_report.enabled': true } },
          },
          has_notifications: {
            filter: { exists: { field: 'scheduled_report.notification.email.to' } },
          },
        },
        runtime_mappings: {
          'scheduled_report.enabled': { type: 'boolean' },
          'scheduled_report.jobType': { type: 'keyword' },
          'scheduled_report.notification.email.to': { type: 'keyword' },
        },
        index: 'test',
        query: { bool: { filter: [{ term: { type: 'scheduled_report' } }] } },
        size: 0,
        track_total_hits: true,
      });

      expect(telemetry).toEqual({
        hasErrors: false,
        number_of_scheduled_reports: 5,
        number_of_enabled_scheduled_reports: 4,
        number_of_scheduled_reports_by_type: {
          printable_pdf_v2: 2,
          PNGV2: 1,
          csv_searchsource: 1,
          csv_v2: 1,
        },
        number_of_enabled_scheduled_reports_by_type: {
          printable_pdf_v2: 2,
          csv_searchsource: 1,
          csv_v2: 1,
        },
        number_of_scheduled_reports_with_notifications: 3,
      });
    });

    test('should return empty results and log warning if query throws error', async () => {
      esClient.search.mockRejectedValueOnce(new Error('oh no'));

      const telemetry = await getTotalCountAggregations({ esClient, index: 'test', logger });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      const loggerCall = logger.warn.mock.calls[0][0];
      const loggerMeta = logger.warn.mock.calls[0][1];
      expect(loggerCall as string).toMatchInlineSnapshot(
        `"Error executing reporting telemetry task: getTotalCountAggregations - Error: oh no"`
      );
      expect(loggerMeta?.tags).toEqual(['reporting', 'telemetry-failed']);
      expect(loggerMeta?.error?.stack_trace).toBeDefined();
      expect(telemetry).toEqual({
        errorMessage: 'oh no',
        hasErrors: true,
        number_of_scheduled_reports: 0,
        number_of_enabled_scheduled_reports: 0,
        number_of_scheduled_reports_by_type: {},
        number_of_enabled_scheduled_reports_by_type: {},
        number_of_scheduled_reports_with_notifications: 0,
      });
    });

    test('should return empty results and log debug log if query throws search_phase_execution_exception error', async () => {
      esClient.search.mockRejectedValueOnce(
        new errors.ResponseError({
          warnings: [],

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

      const telemetry = await getTotalCountAggregations({ esClient, index: 'test', logger });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      const loggerCalls = loggingSystemMock.collect(logger);
      expect(loggerCalls.debug).toHaveLength(2);
      expect(loggerCalls.debug[0][0]).toEqual(
        `query for getTotalCountAggregations - {\"index\":\"test\",\"size\":0,\"track_total_hits\":true,\"query\":{\"bool\":{\"filter\":[{\"term\":{\"type\":\"scheduled_report\"}}]}},\"runtime_mappings\":{\"scheduled_report.enabled\":{\"type\":\"boolean\"},\"scheduled_report.jobType\":{\"type\":\"keyword\"},\"scheduled_report.notification.email.to\":{\"type\":\"keyword\"}},\"aggs\":{\"by_job_type\":{\"terms\":{\"field\":\"scheduled_report.jobType\",\"size\":20}},\"enabled\":{\"filter\":{\"term\":{\"scheduled_report.enabled\":true}},\"aggs\":{\"by_job_type\":{\"terms\":{\"field\":\"scheduled_report.jobType\",\"size\":20}}}},\"has_notifications\":{\"filter\":{\"exists\":{\"field\":\"scheduled_report.notification.email.to\"}}}}}`
      );
      expect(loggerCalls.debug[1][0]).toMatchInlineSnapshot(`
        "Error executing reporting telemetry task: getTotalCountAggregations - ResponseError: search_phase_execution_exception
        	Caused by:
        		no_shard_available_action_exception: This is the nested reason"
      `);
      // logger meta
      expect(loggerCalls.debug[1][1]?.tags).toEqual(['reporting', 'telemetry-failed']);
      expect(loggerCalls.debug[1][1]?.error?.stack_trace).toBeDefined();
      expect(loggerCalls.warn).toHaveLength(0);

      expect(telemetry).toEqual({
        errorMessage: 'no_shard_available_action_exception',
        hasErrors: true,
        number_of_scheduled_reports: 0,
        number_of_enabled_scheduled_reports: 0,
        number_of_scheduled_reports_by_type: {},
        number_of_enabled_scheduled_reports_by_type: {},
        number_of_scheduled_reports_with_notifications: 0,
      });
    });
  });
});
