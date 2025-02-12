/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { MockedLogger, loggerMock } from '@kbn/logging-mocks';
import { errors } from '@elastic/elasticsearch';
import {
  getExecutionsPerDayCount,
  parseExecutionFailureByRuleType,
  parseRuleTypeBucket,
  parsePercentileAggs,
  parseExecutionCountAggregationResults,
  getExecutionTimeoutsPerDayCount,
} from './get_telemetry_from_event_log';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;
let logger: MockedLogger;

describe('event log telemetry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggerMock.create();
  });

  describe('parseRuleTypeBucket', () => {
    test('should correctly parse rule type bucket results', () => {
      expect(
        parseRuleTypeBucket([
          {
            key: '.index-threshold',
            doc_count: 78,
            avg_es_search_duration: {
              value: 40.76056338028169,
            },
            percentile_alerts: {
              values: {
                '50.0': 1,
                '90.0': 1,
                '99.0': 1,
              },
            },
            execution_failures: {
              doc_count: 7,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: 'execute',
                    doc_count: 4,
                  },
                  {
                    key: 'decrypt',
                    doc_count: 3,
                  },
                ],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 0,
                '90.0': 0,
                '99.0': 0,
              },
            },
            avg_execution_time: {
              value: 100576923.07692307,
            },
            avg_total_search_duration: {
              value: 43.74647887323944,
            },
          },
          {
            key: 'document.test.',
            doc_count: 42,
            avg_es_search_duration: {
              value: 0,
            },
            percentile_alerts: {
              values: {
                '50.0': 5,
                '90.0': 5,
                '99.0': 5,
              },
            },
            execution_failures: {
              doc_count: 2,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: 'decrypt',
                    doc_count: 2,
                  },
                ],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 5,
                '90.0': 5,
                '99.0': 5,
              },
            },
            avg_execution_time: {
              value: 770071428.5714285,
            },
            avg_total_search_duration: {
              value: 0,
            },
          },
          {
            key: 'logs.alert.document.count',
            doc_count: 28,
            avg_es_search_duration: {
              value: 26.962962962962962,
            },
            percentile_alerts: {
              values: {
                '50.0': 0,
                '90.0': 0,
                '99.0': 0,
              },
            },
            execution_failures: {
              doc_count: 1,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: 'decrypt',
                    doc_count: 1,
                  },
                ],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 0,
                '90.0': 0,
                '99.0': 0,
              },
            },
            avg_execution_time: {
              value: 88321428.57142857,
            },
            avg_total_search_duration: {
              value: 31.296296296296298,
            },
          },
        ])
      ).toEqual({
        countRuleExecutionsByType: {
          '__index-threshold': 78,
          document__test__: 42,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 28,
        },
        avgExecutionTimeByType: {
          '__index-threshold': 101,
          document__test__: 770,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 88,
        },
        avgEsSearchDurationByType: {
          '__index-threshold': 41,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 27,
        },
        avgTotalSearchDurationByType: {
          '__index-threshold': 44,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 31,
        },
        generatedActionsPercentilesByType: {
          p50: {
            '__index-threshold': 0,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p90: {
            '__index-threshold': 0,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p99: {
            '__index-threshold': 0,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
        },
        alertsPercentilesByType: {
          p50: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
        },
      });
    });

    test('should handle missing values', () => {
      expect(
        parseRuleTypeBucket([
          {
            key: '.index-threshold',
            doc_count: 78,
            percentile_alerts: {
              values: {
                '50.0': 1,
                '90.0': 1,
                '99.0': 1,
              },
            },
            execution_failures: {
              doc_count: 7,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  // @ts-expect-error
                  {
                    key: 'execute',
                  },
                  {
                    key: 'decrypt',
                    doc_count: 3,
                  },
                ],
              },
            },
            // @ts-expect-error
            percentile_scheduled_actions: {},
            avg_execution_time: {
              value: 100576923.07692307,
            },
            avg_total_search_duration: {
              value: 43.74647887323944,
            },
          },
          {
            key: 'document.test.',
            avg_es_search_duration: {
              value: 0,
            },
            percentile_alerts: {
              values: {
                '50.0': 5,
                '90.0': 5,
                '99.0': 5,
              },
            },
            execution_failures: {
              doc_count: 2,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: 'decrypt',
                    doc_count: 2,
                  },
                ],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 5,
                '90.0': 5,
                '99.0': 5,
              },
            },
            // @ts-expect-error
            avg_execution_time: {},
            avg_total_search_duration: {
              value: 0,
            },
          },
          // @ts-expect-error
          {
            key: 'logs.alert.document.count',
          },
        ])
      ).toEqual({
        countRuleExecutionsByType: {
          '__index-threshold': 78,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 0,
        },
        avgExecutionTimeByType: {
          '__index-threshold': 101,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 0,
        },
        avgEsSearchDurationByType: {
          '__index-threshold': 0,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 0,
        },
        avgTotalSearchDurationByType: {
          '__index-threshold': 44,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 0,
        },
        generatedActionsPercentilesByType: {
          p50: {
            document__test__: 5,
          },
          p90: {
            document__test__: 5,
          },
          p99: {
            document__test__: 5,
          },
        },
        alertsPercentilesByType: {
          p50: {
            '__index-threshold': 1,
            document__test__: 5,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 5,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 5,
          },
        },
      });
    });

    test('should handle empty input', () => {
      expect(parseRuleTypeBucket([])).toEqual({
        countRuleExecutionsByType: {},
        avgExecutionTimeByType: {},
        avgEsSearchDurationByType: {},
        avgTotalSearchDurationByType: {},
        generatedActionsPercentilesByType: {
          p50: {},
          p90: {},
          p99: {},
        },
        alertsPercentilesByType: {
          p50: {},
          p90: {},
          p99: {},
        },
      });
    });

    test('should handle undefined input', () => {
      // @ts-expect-error
      expect(parseRuleTypeBucket(undefined)).toEqual({
        countRuleExecutionsByType: {},
        avgExecutionTimeByType: {},
        avgEsSearchDurationByType: {},
        avgTotalSearchDurationByType: {},
        generatedActionsPercentilesByType: {
          p50: {},
          p90: {},
          p99: {},
        },
        alertsPercentilesByType: {
          p50: {},
          p90: {},
          p99: {},
        },
      });
    });
  });

  describe('parsePercentileAggs', () => {
    test('should correctly format percentile aggregation output', () => {
      expect(
        parsePercentileAggs(
          {
            '50.0': 1,
            '90.0': 2,
            '99.0': 3,
          },
          'ruleTypeId'
        )
      ).toEqual({
        p50: {
          ruleTypeId: 1,
        },
        p90: {
          ruleTypeId: 2,
        },
        p99: {
          ruleTypeId: 3,
        },
      });
    });

    test('should correctly format percentile aggregation output when no rule type is specified', () => {
      expect(
        parsePercentileAggs({
          '50.0': 1,
          '90.0': 2,
          '99.0': 3,
        })
      ).toEqual({
        p50: 1,
        p90: 2,
        p99: 3,
      });
    });

    test('should handle unknown keys', () => {
      expect(
        parsePercentileAggs(
          {
            '50.0': 1,
            '70.0': 2,
            '99.0': 3,
          },
          'ruleTypeId'
        )
      ).toEqual({
        p50: {
          ruleTypeId: 1,
        },
        p99: {
          ruleTypeId: 3,
        },
      });
    });

    test('should handle empty input', () => {
      expect(parsePercentileAggs({}, 'ruleTypeId')).toEqual({});
    });

    test('should handle undefined input', () => {
      expect(
        parsePercentileAggs(undefined as unknown as Record<string, number>, 'ruleTypeId')
      ).toEqual({});
    });
  });

  describe('parseExecutionFailureByRuleType', () => {
    test('should format execution failures by rule type', () => {
      expect(
        parseExecutionFailureByRuleType([
          {
            key: '.index-threshold',
            doc_count: 78,
            avg_es_search_duration: {
              value: 40.76056338028169,
            },
            percentile_alerts: {
              values: {
                '50.0': 1,
                '95.0': 1,
                '99.0': 1,
              },
            },
            execution_failures: {
              doc_count: 7,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: 'execute',
                    doc_count: 4,
                  },
                  {
                    key: 'decrypt',
                    doc_count: 3,
                  },
                ],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 0,
                '95.0': 0,
                '99.0': 0,
              },
            },
            avg_execution_time: {
              value: 100576923.07692307,
            },
            avg_total_search_duration: {
              value: 43.74647887323944,
            },
          },
          {
            key: 'document.test.',
            doc_count: 42,
            avg_es_search_duration: {
              value: 0,
            },
            percentile_alerts: {
              values: {
                '50.0': 5,
                '95.0': 5,
                '99.0': 5,
              },
            },
            execution_failures: {
              doc_count: 2,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: 'decrypt',
                    doc_count: 2,
                  },
                ],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 5,
                '95.0': 5,
                '99.0': 5,
              },
            },
            avg_execution_time: {
              value: 770071428.5714285,
            },
            avg_total_search_duration: {
              value: 0,
            },
          },
          {
            key: 'logs.alert.document.count',
            doc_count: 28,
            avg_es_search_duration: {
              value: 26.962962962962962,
            },
            percentile_alerts: {
              values: {
                '50.0': 0,
                '95.0': 0,
                '99.0': 0,
              },
            },
            execution_failures: {
              doc_count: 1,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: 'decrypt',
                    doc_count: 1,
                  },
                ],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 0,
                '95.0': 0,
                '99.0': 0,
              },
            },
            avg_execution_time: {
              value: 88321428.57142857,
            },
            avg_total_search_duration: {
              value: 31.296296296296298,
            },
          },
        ])
      ).toEqual({
        countFailedExecutionsByReasonByType: {
          decrypt: {
            '__index-threshold': 3,
            document__test__: 2,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
          execute: {
            '__index-threshold': 4,
          },
        },
      });
    });

    test('should handle results with some empty execution failures', () => {
      expect(
        parseExecutionFailureByRuleType([
          {
            key: '.index-threshold',
            doc_count: 78,
            avg_es_search_duration: {
              value: 40.76056338028169,
            },
            percentile_alerts: {
              values: {
                '50.0': 1,
                '95.0': 1,
                '99.0': 1,
              },
            },
            execution_failures: {
              doc_count: 9,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 0,
                '95.0': 0,
                '99.0': 0,
              },
            },
            avg_execution_time: {
              value: 100576923.07692307,
            },
            avg_total_search_duration: {
              value: 43.74647887323944,
            },
          },
          {
            key: 'document.test.',
            doc_count: 42,
            avg_es_search_duration: {
              value: 0,
            },
            percentile_alerts: {
              values: {
                '50.0': 5,
                '95.0': 5,
                '99.0': 5,
              },
            },
            execution_failures: {
              doc_count: 2,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: 'decrypt',
                    doc_count: 2,
                  },
                ],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 5,
                '95.0': 5,
                '99.0': 5,
              },
            },
            avg_execution_time: {
              value: 770071428.5714285,
            },
            avg_total_search_duration: {
              value: 0,
            },
          },
          {
            key: 'logs.alert.document.count',
            doc_count: 28,
            avg_es_search_duration: {
              value: 26.962962962962962,
            },
            percentile_alerts: {
              values: {
                '50.0': 0,
                '95.0': 0,
                '99.0': 0,
              },
            },
            execution_failures: {
              doc_count: 1,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: 'decrypt',
                    doc_count: 1,
                  },
                ],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 0,
                '95.0': 0,
                '99.0': 0,
              },
            },
            avg_execution_time: {
              value: 88321428.57142857,
            },
            avg_total_search_duration: {
              value: 31.296296296296298,
            },
          },
        ])
      ).toEqual({
        countFailedExecutionsByReasonByType: {
          decrypt: {
            document__test__: 2,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
        },
      });
    });

    test('should handle results with empty execution failures', () => {
      expect(
        parseExecutionFailureByRuleType([
          {
            key: '.index-threshold',
            doc_count: 78,
            avg_es_search_duration: {
              value: 40.76056338028169,
            },
            percentile_alerts: {
              values: {
                '50.0': 1,
                '95.0': 1,
                '99.0': 1,
              },
            },
            execution_failures: {
              doc_count: 0,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 0,
                '95.0': 0,
                '99.0': 0,
              },
            },
            avg_execution_time: {
              value: 100576923.07692307,
            },
            avg_total_search_duration: {
              value: 43.74647887323944,
            },
          },
          {
            key: 'document.test.',
            doc_count: 42,
            avg_es_search_duration: {
              value: 0,
            },
            percentile_alerts: {
              values: {
                '50.0': 5,
                '95.0': 5,
                '99.0': 5,
              },
            },
            execution_failures: {
              doc_count: 0,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 5,
                '95.0': 5,
                '99.0': 5,
              },
            },
            avg_execution_time: {
              value: 770071428.5714285,
            },
            avg_total_search_duration: {
              value: 0,
            },
          },
          {
            key: 'logs.alert.document.count',
            doc_count: 28,
            avg_es_search_duration: {
              value: 26.962962962962962,
            },
            percentile_alerts: {
              values: {
                '50.0': 0,
                '95.0': 0,
                '99.0': 0,
              },
            },
            execution_failures: {
              doc_count: 0,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 0,
                '95.0': 0,
                '99.0': 0,
              },
            },
            avg_execution_time: {
              value: 88321428.57142857,
            },
            avg_total_search_duration: {
              value: 31.296296296296298,
            },
          },
        ])
      ).toEqual({ countFailedExecutionsByReasonByType: {} });
    });

    test('should handle results with no execution failures', () => {
      expect(
        parseExecutionFailureByRuleType([
          // @ts-expect-error
          {
            key: '.index-threshold',
            doc_count: 78,
            avg_es_search_duration: {
              value: 40.76056338028169,
            },
            percentile_alerts: {
              values: {
                '50.0': 1,
                '95.0': 1,
                '99.0': 1,
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 0,
                '95.0': 0,
                '99.0': 0,
              },
            },
            avg_execution_time: {
              value: 100576923.07692307,
            },
            avg_total_search_duration: {
              value: 43.74647887323944,
            },
          },
          // @ts-expect-error
          {
            key: 'document.test.',
            doc_count: 42,
            avg_es_search_duration: {
              value: 0,
            },
            percentile_alerts: {
              values: {
                '50.0': 5,
                '95.0': 5,
                '99.0': 5,
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 5,
                '95.0': 5,
                '99.0': 5,
              },
            },
            avg_execution_time: {
              value: 770071428.5714285,
            },
            avg_total_search_duration: {
              value: 0,
            },
          },
          // @ts-expect-error
          {
            key: 'logs.alert.document.count',
            doc_count: 28,
            avg_es_search_duration: {
              value: 26.962962962962962,
            },
            percentile_alerts: {
              values: {
                '50.0': 0,
                '95.0': 0,
                '99.0': 0,
              },
            },
            percentile_scheduled_actions: {
              values: {
                '50.0': 0,
                '95.0': 0,
                '99.0': 0,
              },
            },
            avg_execution_time: {
              value: 88321428.57142857,
            },
            avg_total_search_duration: {
              value: 31.296296296296298,
            },
          },
        ])
      ).toEqual({ countFailedExecutionsByReasonByType: {} });
    });

    test('should handle empty input', () => {
      expect(parseExecutionFailureByRuleType([])).toEqual({
        countFailedExecutionsByReasonByType: {},
      });
    });

    test('should handle undefined input', () => {
      // @ts-expect-error
      expect(parseExecutionFailureByRuleType(undefined)).toEqual({
        countFailedExecutionsByReasonByType: {},
      });
    });
  });

  describe('parseExecutionCountAggregationResults', () => {
    test('should correctly format aggregation results', () => {
      expect(
        parseExecutionCountAggregationResults({
          avg_es_search_duration: {
            value: 26.246376811594203,
          },
          percentile_alerts: {
            values: {
              '50.0': 1,
              '90.0': 5,
              '99.0': 5,
            },
          },
          execution_failures: {
            doc_count: 10,
            by_reason: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'decrypt',
                  doc_count: 6,
                },
                {
                  key: 'execute',
                  doc_count: 4,
                },
              ],
            },
          },
          percentile_scheduled_actions: {
            values: {
              '50.0': 0,
              '90.0': 5,
              '99.0': 5,
            },
          },
          avg_execution_time: {
            value: 288250000,
          },
          avg_total_search_duration: {
            value: 28.630434782608695,
          },
        })
      ).toEqual({
        countTotalFailedExecutions: 10,
        countFailedExecutionsByReason: {
          decrypt: 6,
          execute: 4,
        },
        avgExecutionTime: 288,
        avgEsSearchDuration: 26,
        avgTotalSearchDuration: 29,
        generatedActionsPercentiles: {
          p50: 0,
          p90: 5,
          p99: 5,
        },
        alertsPercentiles: {
          p50: 1,
          p90: 5,
          p99: 5,
        },
      });
    });

    test('should handle missing values', () => {
      expect(
        parseExecutionCountAggregationResults({
          // @ts-expect-error
          avg_es_search_duration: {},
          percentile_alerts: {
            values: {
              '50.0': 1,
              '70.0': 5,
              '99.0': 5,
            },
          },
          execution_failures: {
            by_reason: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                // @ts-expect-error
                {
                  key: 'decrypt',
                },
                {
                  key: 'execute',
                  doc_count: 4,
                },
              ],
            },
          },
          // @ts-expect-error
          percentile_scheduled_actions: {},
          avg_total_search_duration: {
            value: 28.630434782608695,
          },
        })
      ).toEqual({
        countTotalFailedExecutions: 0,
        countFailedExecutionsByReason: {
          decrypt: 0,
          execute: 4,
        },
        avgExecutionTime: 0,
        avgEsSearchDuration: 0,
        avgTotalSearchDuration: 29,
        generatedActionsPercentiles: {},
        alertsPercentiles: {
          p50: 1,
          p99: 5,
        },
      });
    });

    test('should handle empty input', () => {
      // @ts-expect-error
      expect(parseExecutionCountAggregationResults({})).toEqual({
        countTotalFailedExecutions: 0,
        countFailedExecutionsByReason: {},
        avgExecutionTime: 0,
        avgEsSearchDuration: 0,
        avgTotalSearchDuration: 0,
        generatedActionsPercentiles: {},
        alertsPercentiles: {},
      });
    });

    test('should handle undefined input', () => {
      // @ts-expect-error
      expect(parseExecutionCountAggregationResults(undefined)).toEqual({
        countTotalFailedExecutions: 0,
        countFailedExecutionsByReason: {},
        avgExecutionTime: 0,
        avgEsSearchDuration: 0,
        avgTotalSearchDuration: 0,
        generatedActionsPercentiles: {},
        alertsPercentiles: {},
      });
    });
  });

  describe('getExecutionsPerDayCount', () => {
    test('should return counts of executions, failed executions and stats about execution durations', async () => {
      esClient.search.mockResponse({
        took: 4,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 148, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: {
          by_rule_type_id: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '.index-threshold',
                doc_count: 78,
                avg_es_search_duration: {
                  value: 40.76056338028169,
                },
                percentile_alerts: {
                  values: {
                    '50.0': 1,
                    '90.0': 1,
                    '99.0': 1,
                  },
                },
                execution_failures: {
                  doc_count: 7,
                  by_reason: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      {
                        key: 'execute',
                        doc_count: 4,
                      },
                      {
                        key: 'decrypt',
                        doc_count: 3,
                      },
                    ],
                  },
                },
                percentile_scheduled_actions: {
                  values: {
                    '50.0': 0,
                    '90.0': 0,
                    '99.0': 0,
                  },
                },
                avg_execution_time: {
                  value: 100576923.07692307,
                },
                avg_total_search_duration: {
                  value: 43.74647887323944,
                },
              },
              {
                key: 'document.test.',
                doc_count: 42,
                avg_es_search_duration: {
                  value: 0,
                },
                percentile_alerts: {
                  values: {
                    '50.0': 5,
                    '90.0': 5,
                    '99.0': 5,
                  },
                },
                execution_failures: {
                  doc_count: 2,
                  by_reason: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      {
                        key: 'decrypt',
                        doc_count: 2,
                      },
                    ],
                  },
                },
                percentile_scheduled_actions: {
                  values: {
                    '50.0': 5,
                    '90.0': 5,
                    '99.0': 5,
                  },
                },
                avg_execution_time: {
                  value: 770071428.5714285,
                },
                avg_total_search_duration: {
                  value: 0,
                },
              },
              {
                key: 'logs.alert.document.count',
                doc_count: 28,
                avg_es_search_duration: {
                  value: 26.962962962962962,
                },
                percentile_alerts: {
                  values: {
                    '50.0': 0,
                    '90.0': 0,
                    '99.0': 0,
                  },
                },
                execution_failures: {
                  doc_count: 1,
                  by_reason: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      {
                        key: 'decrypt',
                        doc_count: 1,
                      },
                    ],
                  },
                },
                percentile_scheduled_actions: {
                  values: {
                    '50.0': 0,
                    '90.0': 0,
                    '99.0': 0,
                  },
                },
                avg_execution_time: {
                  value: 88321428.57142857,
                },
                avg_total_search_duration: {
                  value: 31.296296296296298,
                },
              },
            ],
          },
          avg_es_search_duration: {
            value: 26.246376811594203,
          },
          percentile_alerts: {
            values: {
              '50.0': 1,
              '90.0': 5,
              '99.0': 5,
            },
          },
          execution_failures: {
            doc_count: 10,
            by_reason: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'decrypt',
                  doc_count: 6,
                },
                {
                  key: 'execute',
                  doc_count: 4,
                },
              ],
            },
          },
          percentile_scheduled_actions: {
            values: {
              '50.0': 0,
              '90.0': 5,
              '99.0': 5,
            },
          },
          avg_execution_time: {
            value: 288250000,
          },
          avg_total_search_duration: {
            value: 28.630434782608695,
          },
          by_execution_status: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'success', doc_count: 21 },
              { key: 'failure', doc_count: 22 },
            ],
          },
        },
      });

      const telemetry = await getExecutionsPerDayCount({ esClient, eventLogIndex: 'test', logger });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      expect(telemetry).toStrictEqual({
        countTotalRuleExecutions: 148,
        countRuleExecutionsByType: {
          '__index-threshold': 78,
          document__test__: 42,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 28,
        },
        countTotalFailedExecutions: 10,
        countFailedExecutionsByReason: {
          decrypt: 6,
          execute: 4,
        },
        countFailedExecutionsByReasonByType: {
          decrypt: {
            '__index-threshold': 3,
            document__test__: 2,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
          execute: {
            '__index-threshold': 4,
          },
        },
        avgExecutionTime: 288,
        avgEsSearchDuration: 26,
        avgTotalSearchDuration: 29,
        avgExecutionTimeByType: {
          '__index-threshold': 101,
          document__test__: 770,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 88,
        },
        avgEsSearchDurationByType: {
          '__index-threshold': 41,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 27,
        },
        avgTotalSearchDurationByType: {
          '__index-threshold': 44,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 31,
        },
        generatedActionsPercentiles: {
          p50: 0,
          p90: 5,
          p99: 5,
        },
        alertsPercentiles: {
          p50: 1,
          p90: 5,
          p99: 5,
        },
        generatedActionsPercentilesByType: {
          p50: {
            '__index-threshold': 0,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p90: {
            '__index-threshold': 0,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p99: {
            '__index-threshold': 0,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
        },
        alertsPercentilesByType: {
          p50: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
        },
        countRulesByExecutionStatus: {
          failure: 22,
          success: 21,
        },
        hasErrors: false,
      });
    });

    test('should return empty results and log warning if query throws error', async () => {
      esClient.search.mockRejectedValue(new Error('oh no'));

      const telemetry = await getExecutionsPerDayCount({ esClient, eventLogIndex: 'test', logger });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      const loggerCall = logger.warn.mock.calls[0][0];
      const loggerMeta = logger.warn.mock.calls[0][1];
      expect(loggerCall as string).toMatchInlineSnapshot(
        `"Error executing alerting telemetry task: getExecutionsPerDayCount - Error: oh no"`
      );
      expect(loggerMeta?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerMeta?.error?.stack_trace).toBeDefined();
      expect(telemetry).toStrictEqual({
        hasErrors: true,
        errorMessage: 'oh no',
        countTotalRuleExecutions: 0,
        countRuleExecutionsByType: {},
        countTotalFailedExecutions: 0,
        countFailedExecutionsByReason: {},
        countFailedExecutionsByReasonByType: {},
        avgExecutionTime: 0,
        avgExecutionTimeByType: {},
        avgEsSearchDuration: 0,
        avgEsSearchDurationByType: {},
        avgTotalSearchDuration: 0,
        avgTotalSearchDurationByType: {},
        generatedActionsPercentiles: {},
        generatedActionsPercentilesByType: {},
        alertsPercentiles: {},
        alertsPercentilesByType: {},
        countRulesByExecutionStatus: {},
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

      const telemetry = await getExecutionsPerDayCount({ esClient, eventLogIndex: 'test', logger });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      const loggerCalls = loggingSystemMock.collect(logger);
      expect(loggerCalls.debug).toHaveLength(2);
      expect(loggerCalls.debug[0][0]).toEqual(
        `query for getExecutionsPerDayCount - {\"index\":\"test\",\"size\":0,\"body\":{\"query\":{\"bool\":{\"filter\":{\"bool\":{\"must\":[{\"term\":{\"event.action\":\"execute\"}},{\"term\":{\"event.provider\":\"alerting\"}},{\"range\":{\"@timestamp\":{\"gte\":\"now-1d\"}}}]}}}},\"aggs\":{\"avg_execution_time\":{\"avg\":{\"field\":\"event.duration\"}},\"avg_es_search_duration\":{\"avg\":{\"field\":\"kibana.alert.rule.execution.metrics.es_search_duration_ms\"}},\"avg_total_search_duration\":{\"avg\":{\"field\":\"kibana.alert.rule.execution.metrics.total_search_duration_ms\"}},\"percentile_scheduled_actions\":{\"percentiles\":{\"field\":\"kibana.alert.rule.execution.metrics.number_of_generated_actions\",\"percents\":[50,90,99]}},\"percentile_alerts\":{\"percentiles\":{\"field\":\"kibana.alert.rule.execution.metrics.alert_counts.active\",\"percents\":[50,90,99]}},\"execution_failures\":{\"filter\":{\"term\":{\"event.outcome\":\"failure\"}},\"aggs\":{\"by_reason\":{\"terms\":{\"field\":\"event.reason\",\"size\":5}}}},\"by_rule_type_id\":{\"terms\":{\"field\":\"rule.category\",\"size\":33},\"aggs\":{\"avg_execution_time\":{\"avg\":{\"field\":\"event.duration\"}},\"avg_es_search_duration\":{\"avg\":{\"field\":\"kibana.alert.rule.execution.metrics.es_search_duration_ms\"}},\"avg_total_search_duration\":{\"avg\":{\"field\":\"kibana.alert.rule.execution.metrics.total_search_duration_ms\"}},\"percentile_scheduled_actions\":{\"percentiles\":{\"field\":\"kibana.alert.rule.execution.metrics.number_of_generated_actions\",\"percents\":[50,90,99]}},\"percentile_alerts\":{\"percentiles\":{\"field\":\"kibana.alert.rule.execution.metrics.alert_counts.active\",\"percents\":[50,90,99]}},\"execution_failures\":{\"filter\":{\"term\":{\"event.outcome\":\"failure\"}},\"aggs\":{\"by_reason\":{\"terms\":{\"field\":\"event.reason\",\"size\":5}}}}}},\"by_execution_status\":{\"terms\":{\"field\":\"event.outcome\"}}}}}`
      );
      expect(loggerCalls.debug[1][0]).toMatchInlineSnapshot(`
        "Error executing alerting telemetry task: getExecutionsPerDayCount - ResponseError: search_phase_execution_exception
        	Caused by:
        		no_shard_available_action_exception: This is the nested reason"
      `);
      // logger meta
      expect(loggerCalls.debug[1][1]?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerCalls.debug[1][1]?.error?.stack_trace).toBeDefined();
      expect(loggerCalls.warn).toHaveLength(0);

      expect(telemetry).toStrictEqual({
        hasErrors: true,
        errorMessage: 'no_shard_available_action_exception',
        countTotalRuleExecutions: 0,
        countRuleExecutionsByType: {},
        countTotalFailedExecutions: 0,
        countFailedExecutionsByReason: {},
        countFailedExecutionsByReasonByType: {},
        avgExecutionTime: 0,
        avgExecutionTimeByType: {},
        avgEsSearchDuration: 0,
        avgEsSearchDurationByType: {},
        avgTotalSearchDuration: 0,
        avgTotalSearchDurationByType: {},
        generatedActionsPercentiles: {},
        generatedActionsPercentilesByType: {},
        alertsPercentiles: {},
        alertsPercentilesByType: {},
        countRulesByExecutionStatus: {},
      });
    });
  });

  describe('getExecutionTimeoutsPerDayCount', () => {
    test('should return counts of timed out executions and counts by type', async () => {
      esClient.search.mockResponse({
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
        },
      });

      const telemetry = await getExecutionTimeoutsPerDayCount({
        esClient,
        eventLogIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      expect(telemetry).toStrictEqual({
        countExecutionTimeouts: 4,
        countExecutionTimeoutsByType: {
          '__index-threshold': 2,
          document__test__: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 1,
        },
        hasErrors: false,
      });
    });

    test('should return empty results and log warning if query throws error', async () => {
      esClient.search.mockRejectedValue(new Error('oh no'));

      const telemetry = await getExecutionTimeoutsPerDayCount({
        esClient,
        eventLogIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      const loggerCall = logger.warn.mock.calls[0][0];
      const loggerMeta = logger.warn.mock.calls[0][1];
      expect(loggerCall as string).toMatchInlineSnapshot(
        `"Error executing alerting telemetry task: getExecutionsTimeoutsPerDayCount - Error: oh no"`
      );
      expect(loggerMeta?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerMeta?.error?.stack_trace).toBeDefined();
      expect(telemetry).toStrictEqual({
        countExecutionTimeouts: 0,
        countExecutionTimeoutsByType: {},
        errorMessage: 'oh no',
        hasErrors: true,
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

      const telemetry = await getExecutionTimeoutsPerDayCount({
        esClient,
        eventLogIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      const loggerCalls = loggingSystemMock.collect(logger);
      expect(loggerCalls.debug).toHaveLength(2);
      expect(loggerCalls.debug[0][0]).toEqual(
        `query for getExecutionTimeoutsPerDayCount - {\"index\":\"test\",\"size\":0,\"body\":{\"query\":{\"bool\":{\"filter\":{\"bool\":{\"must\":[{\"term\":{\"event.action\":\"execute-timeout\"}},{\"term\":{\"event.provider\":\"alerting\"}},{\"range\":{\"@timestamp\":{\"gte\":\"now-1d\"}}}]}}}},\"aggs\":{\"by_rule_type_id\":{\"terms\":{\"field\":\"rule.category\",\"size\":33}}}}}`
      );
      expect(loggerCalls.debug[1][0]).toMatchInlineSnapshot(`
        "Error executing alerting telemetry task: getExecutionsTimeoutsPerDayCount - ResponseError: search_phase_execution_exception
        	Caused by:
        		no_shard_available_action_exception: This is the nested reason"
      `);
      // logger meta
      expect(loggerCalls.debug[1][1]?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerCalls.debug[1][1]?.error?.stack_trace).toBeDefined();
      expect(loggerCalls.warn).toHaveLength(0);

      expect(telemetry).toStrictEqual({
        hasErrors: true,
        errorMessage: 'no_shard_available_action_exception',
        countExecutionTimeouts: 0,
        countExecutionTimeoutsByType: {},
      });
    });
  });
});
