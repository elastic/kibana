/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import {
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
} from '../../../../authorization';
import { getRulesWithGaps } from './get_rules_with_gaps';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

describe('getRulesWithGaps', () => {
  let context: any;
  const auditLogger = auditLoggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();

  const params = {
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-02T00:00:00.000Z',
    statuses: ['active', 'error'],
  };

  const mockAuthFilter = {
    filter: { type: 'mock_filter' },
  };

  beforeEach(() => {
    context = {
      authorization: {
        getFindAuthorizationFilter: jest.fn().mockResolvedValue(mockAuthFilter),
      },
      logger: loggerMock.create(),
      auditLogger,
      getEventLogClient: jest.fn().mockResolvedValue(mockEventLogClient),
    };
    (auditLogger.log as jest.Mock).mockClear();

    // Default mock response for aggregateEventsWithAuthFilter
    mockEventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
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
      await getRulesWithGaps(context, params);

      expect(context.authorization.getFindAuthorizationFilter).toHaveBeenCalledWith({
        authorizationEntity: AlertingAuthorizationEntity.Alert,
        filterOpts: {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'kibana.alert.rule.rule_type_id',
            consumer: 'kibana.alert.rule.consumer',
          },
        },
      });
    });

    it('should throw and log audit event when authorization fails', async () => {
      const authError = new Error('Authorization failed');
      context.authorization.getFindAuthorizationFilter.mockRejectedValue(authError);

      await expect(getRulesWithGaps(context, params)).rejects.toThrow('Authorization failed');

      expect(auditLogger.log).toHaveBeenCalledWith(
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
        unique_rule_ids: {
          buckets: [{ key: 'rule-1' }, { key: 'rule-2' }],
        },
      };

      mockEventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: mockAggregations,
      });

      const result = await getRulesWithGaps(context, params);

      expect(mockEventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        mockAuthFilter.filter,
        expect.objectContaining({
          start: params.start,
          end: params.end,
          filter:
            'kibana.alert.rule.gap: * AND (kibana.alert.rule.gap.status:active OR kibana.alert.rule.gap.status:error)',
          aggs: expect.any(Object),
        })
      );

      expect(result).toEqual({
        total: 2,
        ruleIds: ['rule-1', 'rule-2'],
      });
    });

    it('should handle empty aggregation results', async () => {
      mockEventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: {
          unique_rule_ids: {
            buckets: [],
          },
        },
      });

      const result = await getRulesWithGaps(context, params);

      expect(result).toEqual({
        total: 0,
        ruleIds: [],
      });
    });

    it('should handle missing status filters', async () => {
      const paramsWithoutStatuses = {
        start: params.start,
        end: params.end,
      };

      mockEventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
        aggregations: {
          unique_rule_ids: {
            buckets: [],
          },
        },
      });

      await getRulesWithGaps(context, paramsWithoutStatuses);

      expect(mockEventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        mockAuthFilter.filter,
        expect.objectContaining({
          filter: 'kibana.alert.rule.gap: *',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle and wrap errors from event log client', async () => {
      const error = new Error('Event log client error');
      mockEventLogClient.aggregateEventsWithAuthFilter.mockRejectedValue(error);

      await expect(getRulesWithGaps(context, params)).rejects.toThrow(
        'Failed to find rules with gaps'
      );
      expect(context.logger.error).toHaveBeenCalled();
    });
  });
});
