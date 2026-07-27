/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { RulesClient } from '../../../../rules_client';
import { getRulesClientMockParams } from '../../../../test_utils';

const eventLogClient = eventLogClientMock.create();
const eventLogger = eventLoggerMock.create();

const { rulesClientParams, unsecuredSavedObjectsClient, authorization, auditLogger } =
  getRulesClientMockParams({ kibanaVersion: 'v8.0.0', eventLogger });

const filter = fromKueryExpression(
  '((alert.attributes.alertTypeId:myType and alert.attributes.consumer:myApp))'
);

describe('getGapsSummaryByRuleIds', () => {
  let rulesClient: RulesClient;

  beforeEach(() => {
    jest.clearAllMocks();
    rulesClient = new RulesClient(rulesClientParams);
    rulesClientParams.getEventLogClient.mockResolvedValue(eventLogClient);
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      filter,
      ensureRuleTypeIsAuthorized() {},
    });
  });

  describe('success', () => {
    const ruleIds = ['1', '2'];
    const start = '2023-11-16T08:00:00.000Z';
    const end = '2023-11-16T09:00:00.000Z';

    beforeEach(() => {
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        aggregations: {
          alertTypeId: {
            buckets: [{ key: ['myType', 'myApp'], doc_count: 1 }],
          },
        },
        saved_objects: [],
        per_page: 0,
        page: 0,
        total: 1,
      });

      eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValue({
        aggregations: {
          unique_rule_ids: {
            buckets: [
              {
                key: '1',
                totalUnfilledDurationMs: { value: 1000 },
                totalInProgressDurationMs: { value: 2000 },
                totalFilledDurationMs: { value: 3000 },
                totalDurationMs: { value: 6000 },
              },
              {
                key: '2',
                totalUnfilledDurationMs: { value: 4000 },
                totalInProgressDurationMs: { value: 5000 },
                totalFilledDurationMs: { value: 6000 },
                totalDurationMs: { value: 15000 },
              },
            ],
          },
        },
      });
    });

    test('returns gaps summary response', async () => {
      const result = await rulesClient.getGapsSummaryByRuleIds({
        ruleIds,
        start,
        end,
      });

      expect(result).toEqual({
        data: [
          {
            ruleId: '1',
            totalUnfilledDurationMs: 1000,
            totalInProgressDurationMs: 2000,
            totalFilledDurationMs: 3000,
            gapFillStatus: 'unfilled',
          },
          {
            ruleId: '2',
            totalUnfilledDurationMs: 4000,
            totalInProgressDurationMs: 5000,
            totalFilledDurationMs: 6000,
            gapFillStatus: 'unfilled',
          },
        ],
      });
    });

    test('requests expected event log aggregations', async () => {
      await rulesClient.getGapsSummaryByRuleIds({
        ruleIds,
        start,
        end,
      });

      expect(eventLogClient.aggregateEventsBySavedObjectIds).toHaveBeenCalledWith(
        'alert',
        ruleIds,
        {
          filter: `event.action: gap AND event.provider: alerting AND not kibana.alert.rule.gap.deleted:true AND kibana.alert.rule.gap.range <= "2023-11-16T09:00:00.000Z" AND kibana.alert.rule.gap.range >= "2023-11-16T08:00:00.000Z"`,
          aggs: {
            unique_rule_ids: {
              terms: {
                field: 'rule.id',
                size: 10000,
              },
              aggs: {
                totalUnfilledDurationMs: {
                  sum: {
                    field: 'kibana.alert.rule.gap.unfilled_duration_ms',
                  },
                },
                totalInProgressDurationMs: {
                  sum: {
                    field: 'kibana.alert.rule.gap.in_progress_duration_ms',
                  },
                },
                totalFilledDurationMs: {
                  sum: {
                    field: 'kibana.alert.rule.gap.filled_duration_ms',
                  },
                },
                totalDurationMs: {
                  sum: {
                    field: 'kibana.alert.rule.gap.total_gap_duration_ms',
                  },
                },
              },
            },
          },
        }
      );
    });

    test('requests required authorizations', async () => {
      await rulesClient.getGapsSummaryByRuleIds({
        ruleIds,
        start,
        end,
      });

      expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledWith({
        authorizationEntity: 'rule',
        filterOpts: {
          fieldNames: {
            consumer: 'alert.attributes.consumer',
            ruleTypeId: 'alert.attributes.alertTypeId',
          },
          type: 'kql',
        },
      });

      expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.any(Object),
          aggs: {
            alertTypeId: {
              multi_terms: {
                terms: [
                  { field: 'alert.attributes.alertTypeId' },
                  { field: 'alert.attributes.consumer' },
                ],
              },
            },
          },
        })
      );
    });
  });

  describe('error handling', () => {
    test('should throw error if authorization fails', async () => {
      authorization.getFindAuthorizationFilter.mockRejectedValue(new Error('Not authorized'));

      await expect(
        rulesClient.getGapsSummaryByRuleIds({
          ruleIds: ['1'],
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T09:00:00.000Z',
        })
      ).rejects.toThrow('Not authorized');

      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Not authorized',
        },
        event: {
          action: 'rule_get_gaps_summary_by_rule_ids',
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          saved_object: undefined,
        },
        message: 'Failed attempt to get gaps summary by rule ids a rule',
      });
    });

    test('should throw error if no rules found', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        aggregations: {
          alertTypeId: {
            buckets: [],
          },
        },
        saved_objects: [],
        per_page: 0,
        page: 0,
        total: 0,
      });

      await expect(
        rulesClient.getGapsSummaryByRuleIds({
          ruleIds: ['1'],
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T09:00:00.000Z',
        })
      ).rejects.toThrow('No rules matching ids 1 found to get gaps summary');
    });

    test('should throw error if rule type authorization fails', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        aggregations: {
          alertTypeId: {
            buckets: [{ key: ['myType', 'myApp'], doc_count: 1 }],
          },
        },
        saved_objects: [],
        per_page: 0,
        page: 0,
        total: 1,
      });

      authorization.bulkEnsureAuthorized.mockRejectedValue(
        new Error('Not authorized for rule type')
      );

      await expect(
        rulesClient.getGapsSummaryByRuleIds({
          ruleIds: ['1'],
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T09:00:00.000Z',
        })
      ).rejects.toThrow('Not authorized for rule type');

      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Not authorized for rule type',
        },
        event: {
          action: 'rule_get_gaps_summary_by_rule_ids',
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          saved_object: undefined,
        },
        message: 'Failed attempt to get gaps summary by rule ids a rule',
      });
    });
  });
});
