/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findGaps } from './find_gaps';
import { getRule } from '../get/get_rule';
import { loggerMock } from '@kbn/logging-mocks';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

jest.mock('../get/get_rule');
jest.mock('../../../../lib/rule_gaps/find_gaps');

const mockRule = {
  id: '1',
  name: 'Test Rule',
  alertTypeId: 'test-type',
  consumer: 'test-consumer',
  enabled: true,
  tags: [],
  actions: [],
  schedule: { interval: '1m' },
  createdAt: new Date(),
  updatedAt: new Date(),
  params: {},
  executionStatus: {
    status: 'ok' as const,
    lastExecutionDate: new Date(),
  },
  notifyWhen: 'onActiveAlert' as const,
  muteAll: false,
  mutedInstanceIds: [],
  updatedBy: null,
  createdBy: null,
  apiKeyOwner: null,
  throttle: null,
  legacyId: null,
  revision: 1,
};

describe('findGaps', () => {
  const mockedGetRule = getRule as jest.MockedFunction<typeof getRule>;
  const auditLogger = auditLoggerMock.create();
  let context: any;

  const params = {
    ruleId: '1',
    page: 1,
    perPage: 10,
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-02T00:00:00.000Z',
  };

  beforeEach(() => {
    context = {
      authorization: {
        ensureAuthorized: jest.fn(),
      },
      logger: loggerMock.create(),
      auditLogger,
      getEventLogClient: jest.fn().mockResolvedValue(eventLogClientMock.create()),
    };
    (auditLogger.log as jest.Mock).mockClear();
    mockedGetRule.mockResolvedValue(mockRule);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('authorization', () => {
    it('should authorize and find gaps successfully', async () => {
      await findGaps(context, params);

      expect(context.authorization.ensureAuthorized).toHaveBeenCalledWith({
        ruleTypeId: mockRule.alertTypeId,
        consumer: mockRule.consumer,
        operation: ReadOperations.FindGaps,
        entity: AlertingAuthorizationEntity.Rule,
      });
    });

    it('should throw error when not authorized', async () => {
      const authError = new Error('Unauthorized');
      context.authorization.ensureAuthorized.mockRejectedValue(authError);

      await expect(findGaps(context, params)).rejects.toThrow(authError);
    });
  });

  describe('auditLogger', () => {
    it('logs audit event when finding gaps successfully', async () => {
      await findGaps(context, params);

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_find_gaps',
            outcome: 'success',
          }),
          kibana: { saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'Test Rule' } },
        })
      );
    });

    it('logs audit event when not authorized to find gaps', async () => {
      const authError = new Error('Unauthorized');
      context.authorization.ensureAuthorized.mockRejectedValue(authError);

      await expect(findGaps(context, params)).rejects.toThrow(authError);

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_find_gaps',
            outcome: 'failure',
          }),
          kibana: { saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'Test Rule' } },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle and wrap errors from getRule', async () => {
      const error = new Error('Rule not found');
      mockedGetRule.mockRejectedValue(error);

      await expect(findGaps(context, params)).rejects.toThrow('Failed to find gaps');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should handle errors from findGaps implementation', async () => {
      const error = new Error('Failed to find gaps');
      context.getEventLogClient.mockRejectedValue(error);

      await expect(findGaps(context, params)).rejects.toThrow('Failed to find gaps');
      expect(context.logger.error).toHaveBeenCalled();
    });
  });
});
