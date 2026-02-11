/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import type { AlertingAuthorization } from '../../../../authorization';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import type { ConstructorOptions } from '../../../../rules_client';
import { RulesClient } from '../../../../rules_client';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { gapFillStatus, gapStatus } from '../../../../../common';

describe('getRuleIdsWithGaps', () => {
  let rulesClient: RulesClient;
  let eventLogClient: ReturnType<typeof eventLogClientMock.create>;
  let rulesClientParams: jest.Mocked<ConstructorOptions>;

  const kibanaVersion = 'v8.0.0';
  const taskManager = taskManagerMock.createStart();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
  const authorization = alertingAuthorizationMock.create();
  const actionsAuthorization = actionsAuthorizationMock.create();
  const auditLogger = auditLoggerMock.create();
  const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
  const backfillClient = backfillClientMock.create();
  const logger = loggingSystemMock.create().get();
  const eventLogger = eventLoggerMock.create();

  const params = {
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-02T00:00:00.000Z',
    statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
    highestPriorityGapFillStatuses: [gapFillStatus.UNFILLED, gapFillStatus.IN_PROGRESS],
  };

  const filter = { type: 'mock_filter' };

  beforeEach(() => {
    eventLogClient = eventLogClientMock.create();

    rulesClientParams = {
      taskManager,
      ruleTypeRegistry,
      unsecuredSavedObjectsClient,
      authorization: authorization as unknown as AlertingAuthorization,
      actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
      spaceId: 'default',
      namespace: 'default',
      getUserName: jest.fn(),
      createAPIKey: jest.fn(),
      logger,
      internalSavedObjectsRepository,
      encryptedSavedObjectsClient: encryptedSavedObjects,
      getActionsClient: jest.fn(),
      getEventLogClient: jest.fn(),
      kibanaVersion,
      auditLogger,
      maxScheduledPerMinute: 10000,
      minimumScheduleInterval: { value: '1m', enforce: false },
      isAuthenticationTypeAPIKey: jest.fn(),
      getAuthenticationAPIKey: jest.fn(),
      getAlertIndicesAlias: jest.fn(),
      alertsService: null,
      backfillClient,
      isSystemAction: jest.fn(),
      connectorAdapterRegistry: new ConnectorAdapterRegistry(),
      uiSettings: uiSettingsServiceMock.createStartContract(),
      eventLogger,
    } as jest.Mocked<ConstructorOptions>;

    jest.clearAllMocks();
    rulesClient = new RulesClient(rulesClientParams);
    rulesClientParams.getEventLogClient.mockResolvedValue(eventLogClient);
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      filter,
      ensureRuleTypeIsAuthorized() {},
    });

    // Set default response for eventLogClient
    eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
      aggregations: {
        unique_rule_ids: {
          buckets: [],
        },
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('authorization', () => {
    it('should get authorization filter with correct parameters', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: {
          latest_gap_timestamp: {
            value: null,
          },
          by_rule: {
            buckets: [],
          },
        },
      });

      await rulesClient.getRuleIdsWithGaps(params);

      expect(authorization.getFindAuthorizationFilter).toHaveBeenCalled();
    });

    it('should throw and log audit event when authorization fails', async () => {
      const authError = new Error('Authorization failed');
      authorization.getFindAuthorizationFilter.mockRejectedValue(authError);

      await expect(rulesClient.getRuleIdsWithGaps(params)).rejects.toThrow('Authorization failed');

      expect(rulesClientParams.auditLogger!.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_get_rules_with_gaps',
            outcome: 'failure',
          }),
          error: {
            code: 'Error',
            message: 'Authorization failed',
          },
        })
      );
    });
  });

  describe('event log aggregation', () => {
    it('should aggregate events with correct parameters', async () => {
      const mockAggregations = {
        by_rule: {
          buckets: [
            {
              key: 'rule-1',
              totalUnfilledDurationMs: { value: 100 },
              totalInProgressDurationMs: { value: 0 },
              totalFilledDurationMs: { value: 0 },
              totalDurationMs: { value: 100 },
            },
            {
              key: 'rule-2',
              totalUnfilledDurationMs: { value: 0 },
              totalInProgressDurationMs: { value: 50 },
              totalFilledDurationMs: { value: 0 },
              totalDurationMs: { value: 50 },
            },
          ],
        },
        latest_gap_timestamp: {
          value: 1704067200000,
        },
      };

      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: mockAggregations,
      });

      const result = await rulesClient.getRuleIdsWithGaps(params);

      expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        filter,
        expect.objectContaining({
          filter: `event.action: gap AND event.provider: alerting AND not kibana.alert.rule.gap.deleted:true AND kibana.alert.rule.gap.range <= "2024-01-02T00:00:00.000Z" AND kibana.alert.rule.gap.range >= "2024-01-01T00:00:00.000Z" AND (kibana.alert.rule.gap.status : unfilled OR kibana.alert.rule.gap.status : partially_filled)`,
          aggs: expect.objectContaining({
            latest_gap_timestamp: { max: { field: '@timestamp' } },
            by_rule: expect.objectContaining({
              terms: { field: 'rule.id', size: 10000, order: { oldest_gap_timestamp: 'asc' } },
              aggs: {
                totalUnfilledDurationMs: {
                  sum: { field: 'kibana.alert.rule.gap.unfilled_duration_ms' },
                },
                totalInProgressDurationMs: {
                  sum: { field: 'kibana.alert.rule.gap.in_progress_duration_ms' },
                },
                totalFilledDurationMs: {
                  sum: { field: 'kibana.alert.rule.gap.filled_duration_ms' },
                },
                totalDurationMs: {
                  sum: { field: 'kibana.alert.rule.gap.total_gap_duration_ms' },
                },
                oldest_gap_timestamp: { min: { field: '@timestamp' } },
              },
            }),
          }),
        })
      );

      expect(result).toEqual({
        total: 2,
        ruleIds: ['rule-1', 'rule-2'],
        latestGapTimestamp: 1704067200000,
      });
    });

    it('should handle empty aggregation results', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: {
          by_rule: { buckets: [] },
          latest_gap_timestamp: {
            value: null,
          },
        },
      });

      const result = await rulesClient.getRuleIdsWithGaps(params);

      expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        filter,
        expect.objectContaining({
          filter: expect.stringContaining(
            'event.action: gap AND event.provider: alerting AND not kibana.alert.rule.gap.deleted:true'
          ),
          aggs: expect.objectContaining({
            latest_gap_timestamp: { max: { field: '@timestamp' } },
            by_rule: expect.objectContaining({
              terms: { field: 'rule.id', size: 10000, order: { oldest_gap_timestamp: 'asc' } },
            }),
          }),
        })
      );

      expect(result).toEqual({
        total: 0,
        ruleIds: [],
        latestGapTimestamp: undefined,
      });
    });

    it('should handle missing status filters', async () => {
      const paramsWithoutStatuses = {
        start: params.start,
        end: params.end,
      };

      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: {
          by_rule: { buckets: [] },
          latest_gap_timestamp: {
            value: null,
          },
        },
      });

      await rulesClient.getRuleIdsWithGaps(paramsWithoutStatuses);

      expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        filter,
        expect.objectContaining({
          filter: `event.action: gap AND event.provider: alerting AND not kibana.alert.rule.gap.deleted:true AND kibana.alert.rule.gap.range <= "2024-01-02T00:00:00.000Z" AND kibana.alert.rule.gap.range >= "2024-01-01T00:00:00.000Z"`,
          aggs: expect.objectContaining({
            latest_gap_timestamp: { max: { field: '@timestamp' } },
            by_rule: expect.objectContaining({
              terms: { field: 'rule.id', size: 10000, order: { oldest_gap_timestamp: 'asc' } },
            }),
          }),
        })
      );
    });

    it('should use the default maxRulesToFetch limit when param not provided', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: {
          by_rule: { buckets: [] },
          latest_gap_timestamp: {
            value: null,
          },
        },
      });

      await rulesClient.getRuleIdsWithGaps(params);

      expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        filter,
        expect.objectContaining({
          aggs: expect.objectContaining({
            by_rule: expect.objectContaining({
              terms: expect.objectContaining({
                size: 10000,
              }),
            }),
          }),
        })
      );
    });

    it('should respect custom maxRulesToFetch value', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: {
          by_rule: { buckets: [] },
          latest_gap_timestamp: {
            value: null,
          },
        },
      });

      await rulesClient.getRuleIdsWithGaps({
        ...params,
        maxRulesToFetch: 123,
      });

      expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        filter,
        expect.objectContaining({
          aggs: expect.objectContaining({
            by_rule: expect.objectContaining({
              terms: expect.objectContaining({
                size: 123,
              }),
            }),
          }),
        })
      );
    });
  });

  describe('ruleTypes filter', () => {
    it('should include ruleTypes filter for a single rule type/consumer pair', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: {
          unique_rule_ids: { buckets: [] },
          latest_gap_timestamp: { value: null },
        },
      });

      await rulesClient.getRuleIdsWithGaps({
        ...params,
        ruleTypes: [{ type: 'my.rule.type', consumer: 'my-consumer' }],
      });

      expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        filter,
        expect.objectContaining({
          filter: expect.stringContaining(
            'AND ((kibana.alert.rule.rule_type_id: "my.rule.type" AND kibana.alert.rule.consumer: "my-consumer"))'
          ),
        })
      );
    });

    it('should include ruleTypes filter joined with OR for multiple pairs', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: {
          unique_rule_ids: { buckets: [] },
          latest_gap_timestamp: { value: null },
        },
      });

      await rulesClient.getRuleIdsWithGaps({
        ...params,
        ruleTypes: [
          { type: 'type.a', consumer: 'cons-a' },
          { type: 'type.b', consumer: 'cons-b' },
        ],
      });

      expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        filter,
        expect.objectContaining({
          filter: expect.stringContaining(
            'AND ((kibana.alert.rule.rule_type_id: "type.a" AND kibana.alert.rule.consumer: "cons-a") OR (kibana.alert.rule.rule_type_id: "type.b" AND kibana.alert.rule.consumer: "cons-b"))'
          ),
        })
      );
    });
  });

  describe('ruleIds filter', () => {
    it('should include ruleIds filter for a single rule id', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: {
          unique_rule_ids: { buckets: [] },
          latest_gap_timestamp: { value: null },
          by_rule: { buckets: [] },
        },
      });

      await rulesClient.getRuleIdsWithGaps({
        ...params,
        ruleIds: ['rule-123'],
      });

      expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        filter,
        expect.objectContaining({
          filter: expect.stringContaining('AND (rule.id: "rule-123")'),
        })
      );
    });

    it('should include ruleIds filter joined with OR for multiple rule ids', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: {
          unique_rule_ids: { buckets: [] },
          latest_gap_timestamp: { value: null },
          by_rule: { buckets: [] },
        },
      });

      await rulesClient.getRuleIdsWithGaps({
        ...params,
        ruleIds: ['rule-a', 'rule-b'],
      });

      expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        filter,
        expect.objectContaining({
          filter: expect.stringContaining('AND (rule.id: "rule-a" OR rule.id: "rule-b")'),
        })
      );
    });

    it('should not include ruleIds filter when ruleIds is empty', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: {
          unique_rule_ids: { buckets: [] },
          latest_gap_timestamp: { value: null },
          by_rule: { buckets: [] },
        },
      });

      await rulesClient.getRuleIdsWithGaps({
        ...params,
        ruleIds: [],
      });

      expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        filter,
        expect.objectContaining({
          filter: expect.not.stringContaining('rule.id:'),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle and wrap errors from event log client', async () => {
      const error = new Error('Event log client error');
      eventLogClient.aggregateEventsWithAuthFilter.mockRejectedValue(error);

      await expect(rulesClient.getRuleIdsWithGaps(params)).rejects.toThrow(
        'Failed to find rules with gaps'
      );
      expect(rulesClientParams.logger!.error).toHaveBeenCalled();
    });
  });
});
