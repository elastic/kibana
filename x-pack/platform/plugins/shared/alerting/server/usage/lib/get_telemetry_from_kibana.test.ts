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
  getTotalCountAggregations,
  getTotalCountInUse,
  getMWTelemetry,
} from './get_telemetry_from_kibana';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../../common';
import { ISavedObjectsRepository } from '@kbn/core/server';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;
let logger: MockedLogger;
const savedObjectsClient = savedObjectsClientMock.create() as unknown as ISavedObjectsRepository;
const thrownError = new Error('Fail');

const mockedResponse = {
  saved_objects: [
    {
      id: '1',
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      attributes: {
        title: 'test_rule_1',
        enabled: true,
        duration: 1800000,
        expirationDate: '2025-09-09T13:13:07.824Z',
        events: [],
        rRule: {
          dtstart: '2024-09-09T13:13:02.054Z',
          tzid: 'Europe/Stockholm',
          freq: 0,
          count: 1,
        },
        createdBy: null,
        updatedBy: null,
        createdAt: '2024-09-09T13:13:07.825Z',
        updatedAt: '2024-09-09T13:13:07.825Z',
        scopedQuery: null,
      },
    },
    {
      id: '2',
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      attributes: {
        title: 'test_rule_2',
        enabled: true,
        duration: 1800000,
        expirationDate: '2025-09-09T13:13:07.824Z',
        events: [],
        rRule: {
          dtstart: '2024-09-09T13:13:02.054Z',
          tzid: 'Europe/Stockholm',
          freq: 3,
          interval: 1,
          byweekday: ['SU'],
        },
        createdBy: null,
        updatedBy: null,
        createdAt: '2024-09-09T13:13:07.825Z',
        updatedAt: '2024-09-09T13:13:07.825Z',
        scopedQuery: {
          filters: [],
          kql: 'kibana.alert.job_errors_results.job_id : * ',
          dsl: '{"bool":{"must":[],"filter":[{"bool":{"should":[{"exists":{"field":"kibana.alert.job_errors_results.job_id"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}',
        },
      },
    },
    {
      id: '3',
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      attributes: {
        title: 'test_rule_3',
        enabled: true,
        duration: 1800000,
        expirationDate: '2025-09-09T13:13:07.824Z',
        events: [],
        rRule: {
          dtstart: '2024-09-09T13:13:02.054Z',
          tzid: 'Europe/Stockholm',
          freq: 3,
          interval: 1,
          byweekday: ['TU'],
        },
        createdBy: null,
        updatedBy: null,
        createdAt: '2024-09-09T13:13:07.825Z',
        updatedAt: '2024-09-09T13:13:07.825Z',
        scopedQuery: null,
      },
    },
  ],
};

describe('kibana index telemetry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
  });

  describe('getTotalCountAggregations', () => {
    test('should return rule counts by rule type id, stats about schedule and throttle intervals and number of actions', async () => {
      esClient.search.mockResponseOnce({
        took: 4,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 4, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: {
          by_rule_type_id: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: '.index-threshold', doc_count: 2 },
              { key: 'logs.alert.document.count', doc_count: 1 },
              { key: 'document.test.', doc_count: 1 },
            ],
          },
          by_execution_status: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'unknown',
                doc_count: 0,
              },
              {
                key: 'ok',
                doc_count: 1,
              },
              {
                key: 'active',
                doc_count: 2,
              },
              {
                key: 'pending',
                doc_count: 3,
              },
              {
                key: 'error',
                doc_count: 4,
              },
              {
                key: 'warning',
                doc_count: 5,
              },
            ],
          },
          by_notify_when: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'onActionGroupChange',
                doc_count: 5,
              },
              {
                key: 'onActiveAlert',
                doc_count: 6,
              },
              {
                key: 'onThrottleInterval',
                doc_count: 7,
              },
            ],
          },
          connector_types_by_consumers: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'alerts',
                actions: {
                  connector_types: {
                    buckets: [
                      {
                        key: '.server-log',
                        doc_count: 2,
                      },
                      {
                        key: '.email',
                        doc_count: 3,
                      },
                    ],
                  },
                },
              },
              {
                key: 'siem',
                actions: {
                  connector_types: {
                    buckets: [
                      {
                        key: '.index',
                        doc_count: 4,
                      },
                    ],
                  },
                },
              },
            ],
          },
          by_search_type: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'esQuery',
                doc_count: 0,
              },
              {
                key: 'searchSource',
                doc_count: 1,
              },
              {
                key: 'esqlQuery',
                doc_count: 3,
              },
            ],
          },
          max_throttle_time: { value: 60 },
          min_throttle_time: { value: 0 },
          avg_throttle_time: { value: 30 },
          max_interval_time: { value: 10 },
          min_interval_time: { value: 1 },
          avg_interval_time: { value: 4.5 },
          max_actions_count: { value: 4 },
          min_actions_count: { value: 0 },
          avg_actions_count: { value: 2.5 },
          sum_rules_with_tags: { value: 10 },
          sum_rules_snoozed: { value: 11 },
          sum_rules_muted: { value: 12 },
          sum_rules_with_muted_alerts: { value: 13 },
        },
      });

      const telemetry = await getTotalCountAggregations({ esClient, alertIndex: 'test', logger });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      expect(telemetry).toEqual({
        connectors_per_alert: {
          avg: 2.5,
          max: 4,
          min: 0,
        },
        count_by_type: {
          '__index-threshold': 2,
          document__test__: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 1,
          '__es-query_es_query': 0,
          '__es-query_esql_query': 3,
          '__es-query_search_source': 1,
        },
        count_total: 4,
        hasErrors: false,
        schedule_time: {
          avg: '4.5s',
          max: '10s',
          min: '1s',
        },
        schedule_time_number_s: {
          avg: 4.5,
          max: 10,
          min: 1,
        },
        throttle_time: {
          avg: '30s',
          max: '60s',
          min: '0s',
        },
        throttle_time_number_s: {
          avg: 30,
          max: 60,
          min: 0,
        },
        count_rules_by_execution_status: {
          success: 3,
          error: 4,
          warning: 5,
        },
        count_rules_with_tags: 10,
        count_rules_by_notify_when: {
          on_action_group_change: 5,
          on_active_alert: 6,
          on_throttle_interval: 7,
        },
        count_rules_snoozed: 11,
        count_rules_muted: 12,
        count_rules_with_muted_alerts: 13,
        count_connector_types_by_consumers: {
          alerts: {
            __email: 3,
            '__server-log': 2,
          },
          siem: {
            __index: 4,
          },
        },
      });
    });

    test('should return empty results and log warning if query throws error', async () => {
      esClient.search.mockRejectedValueOnce(new Error('oh no'));

      const telemetry = await getTotalCountAggregations({ esClient, alertIndex: 'test', logger });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      const loggerCall = logger.warn.mock.calls[0][0];
      const loggerMeta = logger.warn.mock.calls[0][1];
      expect(loggerCall as string).toMatchInlineSnapshot(
        `"Error executing alerting telemetry task: getTotalCountAggregations - Error: oh no"`
      );
      expect(loggerMeta?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerMeta?.error?.stack_trace).toBeDefined();
      expect(telemetry).toEqual({
        errorMessage: 'oh no',
        hasErrors: true,
        connectors_per_alert: {
          avg: 0,
          max: 0,
          min: 0,
        },
        count_by_type: {},
        count_rules_by_execution_status: {
          success: 0,
          error: 0,
          warning: 0,
        },
        count_rules_with_tags: 0,
        count_rules_by_notify_when: {
          on_action_group_change: 0,
          on_active_alert: 0,
          on_throttle_interval: 0,
        },
        count_rules_snoozed: 0,
        count_rules_muted: 0,
        count_rules_with_muted_alerts: 0,
        count_total: 0,
        schedule_time: {
          avg: '0s',
          max: '0s',
          min: '0s',
        },
        schedule_time_number_s: {
          avg: 0,
          max: 0,
          min: 0,
        },
        throttle_time: {
          avg: '0s',
          max: '0s',
          min: '0s',
        },
        throttle_time_number_s: {
          avg: 0,
          max: 0,
          min: 0,
        },
        count_connector_types_by_consumers: {},
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

      const telemetry = await getTotalCountAggregations({ esClient, alertIndex: 'test', logger });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      const loggerCalls = loggingSystemMock.collect(logger);
      expect(loggerCalls.debug).toHaveLength(2);
      expect(loggerCalls.debug[0][0]).toEqual(
        `query for getTotalCountAggregations - {\"index\":\"test\",\"size\":0,\"body\":{\"query\":{\"bool\":{\"filter\":[{\"term\":{\"type\":\"alert\"}}]}},\"runtime_mappings\":{\"rule_action_count\":{\"type\":\"long\",\"script\":{\"source\":\"\\n                def alert = params._source['alert'];\\n                if (alert != null) {\\n                  def actions = alert.actions;\\n                  if (actions != null) {\\n                    emit(actions.length);\\n                  } else {\\n                    emit(0);\\n                  }\\n                }\"}},\"rule_schedule_interval\":{\"type\":\"long\",\"script\":{\"source\":\"\\n                int parsed = 0;\\n                if (doc['alert.schedule.interval'].size() > 0) {\\n                  def interval = doc['alert.schedule.interval'].value;\\n\\n                  if (interval.length() > 1) {\\n                      // get last char\\n                      String timeChar = interval.substring(interval.length() - 1);\\n                      // remove last char\\n                      interval = interval.substring(0, interval.length() - 1);\\n\\n                      if (interval.chars().allMatch(Character::isDigit)) {\\n                        // using of regex is not allowed in painless language\\n                        parsed = Integer.parseInt(interval);\\n\\n                        if (timeChar.equals(\\\"s\\\")) {\\n                          parsed = parsed;\\n                        } else if (timeChar.equals(\\\"m\\\")) {\\n                          parsed = parsed * 60;\\n                        } else if (timeChar.equals(\\\"h\\\")) {\\n                          parsed = parsed * 60 * 60;\\n                        } else if (timeChar.equals(\\\"d\\\")) {\\n                          parsed = parsed * 24 * 60 * 60;\\n                        }\\n                        emit(parsed);\\n                      }\\n                  }\\n                }\\n                emit(parsed);\\n              \"}},\"rule_throttle_interval\":{\"type\":\"long\",\"script\":{\"source\":\"\\n                int parsed = 0;\\n                if (doc['alert.throttle'].size() > 0) {\\n                def throttle = doc['alert.throttle'].value;\\n\\n                if (throttle.length() > 1) {\\n                    // get last char\\n                    String timeChar = throttle.substring(throttle.length() - 1);\\n                    // remove last char\\n                    throttle = throttle.substring(0, throttle.length() - 1);\\n\\n                    if (throttle.chars().allMatch(Character::isDigit)) {\\n                      // using of regex is not allowed in painless language\\n                      parsed = Integer.parseInt(throttle);\\n\\n                      if (timeChar.equals(\\\"s\\\")) {\\n                        parsed = parsed;\\n                      } else if (timeChar.equals(\\\"m\\\")) {\\n                        parsed = parsed * 60;\\n                      } else if (timeChar.equals(\\\"h\\\")) {\\n                        parsed = parsed * 60 * 60;\\n                      } else if (timeChar.equals(\\\"d\\\")) {\\n                        parsed = parsed * 24 * 60 * 60;\\n                      }\\n                      emit(parsed);\\n                    }\\n                }\\n              }\\n              emit(parsed);\\n              \"}},\"rule_with_tags\":{\"type\":\"long\",\"script\":{\"source\":\"\\n               def rule = params._source['alert'];\\n                if (rule != null && rule.tags != null) {\\n                  if (rule.tags.size() > 0) {\\n                    emit(1);\\n                  } else {\\n                    emit(0);\\n                  }\\n                }\"}},\"rule_snoozed\":{\"type\":\"long\",\"script\":{\"source\":\"\\n                def rule = params._source['alert'];\\n                if (rule != null && rule.snoozeSchedule != null) {\\n                  if (rule.snoozeSchedule.size() > 0) {\\n                    emit(1);\\n                  } else {\\n                    emit(0);\\n                  }\\n                }\"}},\"rule_muted\":{\"type\":\"long\",\"script\":{\"source\":\"\\n                if (doc['alert.muteAll'].value == true) {\\n                  emit(1);\\n                } else {\\n                  emit(0);\\n                }\"}},\"rule_with_muted_alerts\":{\"type\":\"long\",\"script\":{\"source\":\"\\n                def rule = params._source['alert'];\\n                if (rule != null && rule.mutedInstanceIds != null) {\\n                  if (rule.mutedInstanceIds.size() > 0) {\\n                    emit(1);\\n                  } else {\\n                    emit(0);\\n                  }\\n                }\"}}},\"aggs\":{\"by_rule_type_id\":{\"terms\":{\"field\":\"alert.alertTypeId\",\"size\":33}},\"max_throttle_time\":{\"max\":{\"field\":\"rule_throttle_interval\"}},\"min_throttle_time\":{\"min\":{\"field\":\"rule_throttle_interval\"}},\"avg_throttle_time\":{\"avg\":{\"field\":\"rule_throttle_interval\"}},\"max_interval_time\":{\"max\":{\"field\":\"rule_schedule_interval\"}},\"min_interval_time\":{\"min\":{\"field\":\"rule_schedule_interval\"}},\"avg_interval_time\":{\"avg\":{\"field\":\"rule_schedule_interval\"}},\"max_actions_count\":{\"max\":{\"field\":\"rule_action_count\"}},\"min_actions_count\":{\"min\":{\"field\":\"rule_action_count\"}},\"avg_actions_count\":{\"avg\":{\"field\":\"rule_action_count\"}},\"by_execution_status\":{\"terms\":{\"field\":\"alert.executionStatus.status\"}},\"by_notify_when\":{\"terms\":{\"field\":\"alert.notifyWhen\"}},\"connector_types_by_consumers\":{\"terms\":{\"field\":\"alert.consumer\"},\"aggs\":{\"actions\":{\"nested\":{\"path\":\"alert.actions\"},\"aggs\":{\"connector_types\":{\"terms\":{\"field\":\"alert.actions.actionTypeId\"}}}}}},\"by_search_type\":{\"terms\":{\"field\":\"alert.params.searchType\"}},\"sum_rules_with_tags\":{\"sum\":{\"field\":\"rule_with_tags\"}},\"sum_rules_snoozed\":{\"sum\":{\"field\":\"rule_snoozed\"}},\"sum_rules_muted\":{\"sum\":{\"field\":\"rule_muted\"}},\"sum_rules_with_muted_alerts\":{\"sum\":{\"field\":\"rule_with_muted_alerts\"}}}}}`
      );
      expect(loggerCalls.debug[1][0]).toMatchInlineSnapshot(`
        "Error executing alerting telemetry task: getTotalCountAggregations - ResponseError: search_phase_execution_exception
        	Caused by:
        		no_shard_available_action_exception: This is the nested reason"
      `);
      // logger meta
      expect(loggerCalls.debug[1][1]?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerCalls.debug[1][1]?.error?.stack_trace).toBeDefined();
      expect(loggerCalls.warn).toHaveLength(0);

      expect(telemetry).toEqual({
        errorMessage: 'no_shard_available_action_exception',
        hasErrors: true,
        connectors_per_alert: {
          avg: 0,
          max: 0,
          min: 0,
        },
        count_by_type: {},
        count_rules_by_execution_status: {
          success: 0,
          error: 0,
          warning: 0,
        },
        count_rules_with_tags: 0,
        count_rules_by_notify_when: {
          on_action_group_change: 0,
          on_active_alert: 0,
          on_throttle_interval: 0,
        },
        count_rules_snoozed: 0,
        count_rules_muted: 0,
        count_rules_with_muted_alerts: 0,
        count_total: 0,
        schedule_time: {
          avg: '0s',
          max: '0s',
          min: '0s',
        },
        schedule_time_number_s: {
          avg: 0,
          max: 0,
          min: 0,
        },
        throttle_time: {
          avg: '0s',
          max: '0s',
          min: '0s',
        },
        throttle_time_number_s: {
          avg: 0,
          max: 0,
          min: 0,
        },
        count_connector_types_by_consumers: {},
      });
    });
  });

  describe('getTotalCountInUse', () => {
    test('should return enabled rule counts by rule type id and number of namespaces', async () => {
      esClient.search.mockResponseOnce({
        took: 4,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 4, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: {
          namespaces_count: { value: 1 },
          by_rule_type_id: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: '.index-threshold', doc_count: 2 },
              { key: 'logs.alert.document.count', doc_count: 1 },
              { key: 'document.test.', doc_count: 1 },
            ],
          },
          by_search_type: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'esQuery', doc_count: 0 },
              { key: 'searchSource', doc_count: 1 },
              { key: 'esqlQuery', doc_count: 3 },
            ],
          },
        },
      });

      const telemetry = await getTotalCountInUse({ esClient, alertIndex: 'test', logger });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      expect(telemetry).toStrictEqual({
        countByType: {
          '__index-threshold': 2,
          document__test__: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 1,
          '__es-query_es_query': 0,
          '__es-query_esql_query': 3,
          '__es-query_search_source': 1,
        },
        countNamespaces: 1,
        countTotal: 4,
        hasErrors: false,
      });
    });

    test('should return empty results and log warning if query throws error', async () => {
      esClient.search.mockRejectedValueOnce(new Error('oh no'));

      const telemetry = await getTotalCountInUse({ esClient, alertIndex: 'test', logger });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      const loggerCall = logger.warn.mock.calls[0][0];
      const loggerMeta = logger.warn.mock.calls[0][1];
      expect(loggerCall as string).toMatchInlineSnapshot(
        `"Error executing alerting telemetry task: getTotalCountInUse - Error: oh no"`
      );
      expect(loggerMeta?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerMeta?.error?.stack_trace).toBeDefined();
      expect(telemetry).toStrictEqual({
        countByType: {},
        countNamespaces: 0,
        countTotal: 0,
        errorMessage: 'oh no',
        hasErrors: true,
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

      const telemetry = await getTotalCountInUse({ esClient, alertIndex: 'test', logger });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      const loggerCalls = loggingSystemMock.collect(logger);
      expect(loggerCalls.debug).toHaveLength(2);
      expect(loggerCalls.debug[0][0]).toEqual(
        `query for getTotalCountInUse - {\"index\":\"test\",\"size\":0,\"body\":{\"query\":{\"bool\":{\"filter\":[{\"term\":{\"type\":\"alert\"}},{\"term\":{\"alert.enabled\":true}}]}},\"aggs\":{\"namespaces_count\":{\"cardinality\":{\"field\":\"namespaces\"}},\"by_rule_type_id\":{\"terms\":{\"field\":\"alert.alertTypeId\",\"size\":33}},\"by_search_type\":{\"terms\":{\"field\":\"alert.params.searchType\"}}}}}`
      );
      expect(loggerCalls.debug[1][0]).toMatchInlineSnapshot(`
        "Error executing alerting telemetry task: getTotalCountInUse - ResponseError: search_phase_execution_exception
        	Caused by:
        		no_shard_available_action_exception: This is the nested reason"
      `);
      // logger meta
      expect(loggerCalls.debug[1][1]?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerCalls.debug[1][1]?.error?.stack_trace).toBeDefined();
      expect(loggerCalls.warn).toHaveLength(0);

      expect(telemetry).toStrictEqual({
        countByType: {},
        countNamespaces: 0,
        countTotal: 0,
        errorMessage: 'no_shard_available_action_exception',
        hasErrors: true,
      });
    });
  });

  describe('getMWTelemetry', () => {
    test('should return MW telemetry', async () => {
      savedObjectsClient.createPointInTimeFinder = jest.fn().mockReturnValue({
        close: jest.fn(),
        find: jest.fn().mockImplementation(async function* () {
          yield mockedResponse;
        }),
      });
      const telemetry = await getMWTelemetry({ savedObjectsClient, logger });

      expect(savedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        namespaces: ['*'],
        perPage: 100,
        fields: ['rRule', 'scopedQuery'],
      });
      expect(telemetry).toStrictEqual({
        count_mw_total: 3,
        count_mw_with_repeat_toggle_on: 2,
        count_mw_with_filter_alert_toggle_on: 1,
        hasErrors: false,
      });
    });

    test('should return empty results and log warning if query throws error', async () => {
      savedObjectsClient.createPointInTimeFinder = jest.fn().mockReturnValue({
        close: jest.fn(),
        find: jest.fn().mockImplementation(async function* () {
          throw thrownError;
        }),
      });

      const telemetry = await getMWTelemetry({ savedObjectsClient, logger });

      expect(savedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        namespaces: ['*'],
        perPage: 100,
        fields: ['rRule', 'scopedQuery'],
      });

      expect(telemetry).toStrictEqual({
        count_mw_total: 0,
        count_mw_with_repeat_toggle_on: 0,
        count_mw_with_filter_alert_toggle_on: 0,
        hasErrors: true,
        errorMessage: 'Fail',
      });

      expect(logger.warn).toHaveBeenCalled();
      const loggerCall = logger.warn.mock.calls[0][0];
      const loggerMeta = logger.warn.mock.calls[0][1];
      expect(loggerCall).toBe(
        'Error executing alerting telemetry task: getTotalMWCount - Error: Fail'
      );
      expect(loggerMeta?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerMeta?.error?.stack_trace).toBeDefined();
    });

    test('should stop on MW max limit count', async () => {
      savedObjectsClient.createPointInTimeFinder = jest.fn().mockReturnValue({
        close: jest.fn(),
        find: jest.fn().mockImplementation(async function* () {
          yield mockedResponse;
        }),
      });
      const telemetry = await getMWTelemetry({ savedObjectsClient, logger, maxDocuments: 1 });

      expect(savedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        namespaces: ['*'],
        perPage: 100,
        fields: ['rRule', 'scopedQuery'],
      });
      expect(telemetry).toStrictEqual({
        count_mw_total: 2,
        count_mw_with_repeat_toggle_on: 1,
        count_mw_with_filter_alert_toggle_on: 1,
        hasErrors: false,
      });
    });
  });
});
