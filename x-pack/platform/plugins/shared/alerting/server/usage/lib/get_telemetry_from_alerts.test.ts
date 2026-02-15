/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { getTotalAlertsCountAggregations } from './get_telemetry_from_alerts';
import { errors } from '@elastic/elasticsearch';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;
let logger: MockedLogger;

describe('kibana index telemetry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
  });

  it('should return total alert counts and alert counts by rule type id', async () => {
    esClient.search.mockResponseOnce({
      took: 4,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 6, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        by_rule_type_id: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: '.index-threshold',
              doc_count: 1,
              ignored_field: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
            {
              key: 'logs.alert.document.count',
              doc_count: 2,
              ignored_field: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: 'kibana.alert.grouping.container.id',
                    doc_count: 2,
                  },
                  {
                    key: 'kibana.alert.grouping.container.name',
                    doc_count: 2,
                  },
                ],
              },
            },
            {
              key: 'document.test.',
              doc_count: 3,
              ignored_field: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
          ],
        },
      },
    });

    const telemetry = await getTotalAlertsCountAggregations({ esClient, logger });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    const debugLogs = loggingSystemMock.collect(logger).debug;
    expect(debugLogs).toHaveLength(2);
    expect(debugLogs[0][0]).toEqual(
      `query for getTotalAlertsCountAggregations - {\"index\":\".alerts-*\",\"size\":0,\"query\":{\"match_all\":{}},\"aggs\":{\"by_rule_type_id\":{\"terms\":{\"field\":\"kibana.alert.rule.rule_type_id\",\"size\":39},\"aggs\":{\"ignored_field\":{\"terms\":{\"field\":\"_ignored\",\"size\":39}}}}}}`
    );
    expect(debugLogs[1][0]).toEqual(
      `results for getTotalAlertsCountAggregations query - {\"took\":4,\"timed_out\":false,\"_shards\":{\"total\":1,\"successful\":1,\"skipped\":0,\"failed\":0},\"hits\":{\"total\":{\"value\":6,\"relation\":\"eq\"},\"max_score\":null,\"hits\":[]},\"aggregations\":{\"by_rule_type_id\":{\"doc_count_error_upper_bound\":0,\"sum_other_doc_count\":0,\"buckets\":[{\"key\":\".index-threshold\",\"doc_count\":1,\"ignored_field\":{\"doc_count_error_upper_bound\":0,\"sum_other_doc_count\":0,\"buckets\":[]}},{\"key\":\"logs.alert.document.count\",\"doc_count\":2,\"ignored_field\":{\"doc_count_error_upper_bound\":0,\"sum_other_doc_count\":0,\"buckets\":[{\"key\":\"kibana.alert.grouping.container.id\",\"doc_count\":2},{\"key\":\"kibana.alert.grouping.container.name\",\"doc_count\":2}]}},{\"key\":\"document.test.\",\"doc_count\":3,\"ignored_field\":{\"doc_count_error_upper_bound\":0,\"sum_other_doc_count\":0,\"buckets\":[]}}]}}}`
    );

    expect(telemetry).toEqual({
      hasErrors: false,
      count_alerts_total: 6,
      count_alerts_by_rule_type: {
        '__index-threshold': 1,
        logs__alert__document__count: 2,
        document__test__: 3,
      },
      count_ignored_fields_by_rule_type: {
        '__index-threshold': 0,
        logs__alert__document__count: 2,
        document__test__: 0,
      },
    });
  });

  it('should return on empty results', async () => {
    esClient.search.mockResponseOnce({
      took: 4,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        by_rule_type_id: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
      },
    });

    const telemetry = await getTotalAlertsCountAggregations({ esClient, logger });

    expect(telemetry).toEqual({
      hasErrors: false,
      count_alerts_total: 0,
      count_alerts_by_rule_type: {},
      count_ignored_fields_by_rule_type: {},
    });
  });

  it('should return empty results and log warning if query throws error', async () => {
    esClient.search.mockRejectedValueOnce(new Error('test'));

    const telemetry = await getTotalAlertsCountAggregations({ esClient, logger });

    expect(esClient.search).toHaveBeenCalledTimes(1);

    const loggerCalls = loggingSystemMock.collect(logger);
    expect(loggerCalls.debug).toHaveLength(1);
    expect(loggerCalls.debug[0][0]).toEqual(
      `query for getTotalAlertsCountAggregations - {\"index\":\".alerts-*\",\"size\":0,\"query\":{\"match_all\":{}},\"aggs\":{\"by_rule_type_id\":{\"terms\":{\"field\":\"kibana.alert.rule.rule_type_id\",\"size\":39},\"aggs\":{\"ignored_field\":{\"terms\":{\"field\":\"_ignored\",\"size\":39}}}}}}`
    );
    expect(loggerCalls.warn).toHaveLength(1);
    expect(loggerCalls.warn[0][0]).toEqual(
      `Error executing alerting telemetry task: getTotalAlertsCountAggregations - Error: test`
    );
    // logger meta
    expect(loggerCalls.warn[0][1]?.tags).toEqual(['alerting', 'telemetry-failed']);
    expect(loggerCalls.warn[0][1]?.error?.stack_trace).toBeDefined();

    expect(telemetry).toEqual({
      hasErrors: true,
      errorMessage: 'test',
      count_alerts_total: 0,
      count_alerts_by_rule_type: {},
      count_ignored_fields_by_rule_type: {},
    });
  });

  it('should return empty results and log debug log if query throws search_phase_execution_exception error', async () => {
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

    const telemetry = await getTotalAlertsCountAggregations({ esClient, logger });

    expect(esClient.search).toHaveBeenCalledTimes(1);

    const loggerCalls = loggingSystemMock.collect(logger);
    expect(loggerCalls.debug).toHaveLength(2);
    expect(loggerCalls.debug[0][0]).toEqual(
      `query for getTotalAlertsCountAggregations - {\"index\":\".alerts-*\",\"size\":0,\"query\":{\"match_all\":{}},\"aggs\":{\"by_rule_type_id\":{\"terms\":{\"field\":\"kibana.alert.rule.rule_type_id\",\"size\":39},\"aggs\":{\"ignored_field\":{\"terms\":{\"field\":\"_ignored\",\"size\":39}}}}}}`
    );
    expect(loggerCalls.debug[1][0]).toMatchInlineSnapshot(`
      "Error executing alerting telemetry task: getTotalAlertsCountAggregations - ResponseError: search_phase_execution_exception
      	Caused by:
      		no_shard_available_action_exception: This is the nested reason"
    `);
    // logger meta
    expect(loggerCalls.debug[1][1]?.tags).toEqual(['alerting', 'telemetry-failed']);
    expect(loggerCalls.debug[1][1]?.error?.stack_trace).toBeDefined();
    expect(loggerCalls.warn).toHaveLength(0);

    expect(telemetry).toEqual({
      hasErrors: true,
      errorMessage: `no_shard_available_action_exception`,
      count_alerts_total: 0,
      count_alerts_by_rule_type: {},
      count_ignored_fields_by_rule_type: {},
    });
  });
});
