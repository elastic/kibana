/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client';
import { unsnoozeInstance } from './unsnooze_instance';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';

describe('unsnooze alert instance', () => {
  const loggerErrorMock = jest.fn();
  const savedObjectsMock = savedObjectsRepositoryMock.create();
  const unsecuredSavedObjectsClient = savedObjectsMock;
  const auditLoggerMock = { log: jest.fn() };
  const authorizationMock = { ensureAuthorized: jest.fn() };
  const actionsAuthorizationMock = { ensureAuthorized: jest.fn() };
  const ruleTypeRegistryMock = { ensureRuleTypeEnabled: jest.fn() };

  afterEach(() => jest.clearAllMocks());

  const context = {
    logger: { error: loggerErrorMock },
    unsecuredSavedObjectsClient,
    auditLogger: auditLoggerMock,
    authorization: authorizationMock,
    actionsAuthorization: actionsAuthorizationMock,
    ruleTypeRegistry: ruleTypeRegistryMock,
    getUserName: jest.fn().mockResolvedValue('test-user'),
    spaceId: 'default',
  } as unknown as RulesClientContext;

  it('removes from snoozedAlerts when alert has conditional snooze entry', async () => {
    savedObjectsMock.get.mockResolvedValueOnce({
      id: 'rule-1',
      type: 'alert',
      attributes: {
        alertTypeId: 'test-rule-type',
        consumer: 'test-consumer',
        actions: [],
        muteAll: false,
        mutedInstanceIds: [],
        snoozedAlerts: [
          {
            alertInstanceId: 'alert-1',
            mutedAt: '2024-01-01T00:00:00.000Z',
            expiresAt: '2099-01-01T00:00:00.000Z',
            conditionOperator: 'any',
          },
          {
            alertInstanceId: 'alert-2',
            mutedAt: '2024-01-01T00:00:00.000Z',
            conditionOperator: 'any',
          },
        ],
      },
      references: [],
      version: 'abc',
    });

    await unsnoozeInstance(context, {
      ruleId: 'rule-1',
      alertInstanceId: 'alert-1',
    });

    expect(savedObjectsMock.update).toHaveBeenCalledWith(
      'alert',
      'rule-1',
      expect.objectContaining({
        snoozedAlerts: [expect.objectContaining({ alertInstanceId: 'alert-2' })],
      }),
      expect.objectContaining({ version: 'abc' })
    );
  });

  it('does nothing when alert is not in snoozedAlerts', async () => {
    savedObjectsMock.get.mockResolvedValueOnce({
      id: 'rule-1',
      type: 'alert',
      attributes: {
        alertTypeId: 'test-rule-type',
        consumer: 'test-consumer',
        actions: [],
        muteAll: false,
        mutedInstanceIds: [],
        snoozedAlerts: [],
      },
      references: [],
      version: 'abc',
    });

    await unsnoozeInstance(context, {
      ruleId: 'rule-1',
      alertInstanceId: 'nonexistent-alert',
    });

    expect(savedObjectsMock.update).not.toHaveBeenCalled();
  });

  it('logs audit event when unsnoozing an alert', async () => {
    savedObjectsMock.get.mockResolvedValueOnce({
      id: 'rule-1',
      type: 'alert',
      attributes: {
        alertTypeId: 'test-rule-type',
        consumer: 'test-consumer',
        name: 'my_rule',
        actions: [],
        muteAll: false,
        mutedInstanceIds: [],
        snoozedAlerts: [
          {
            alertInstanceId: 'alert-1',
            mutedAt: '2024-01-01T00:00:00.000Z',
            conditionOperator: 'any',
          },
        ],
      },
      references: [],
      version: 'abc',
    });

    await unsnoozeInstance(context, {
      ruleId: 'rule-1',
      alertInstanceId: 'alert-1',
    });

    expect(auditLoggerMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'rule_alert_unsnooze',
          outcome: 'unknown',
        }),
      })
    );
  });

  it('logs audit event when not authorised to unsnooze an alert', async () => {
    savedObjectsMock.get.mockResolvedValueOnce({
      id: 'rule-1',
      type: 'alert',
      attributes: {
        alertTypeId: 'test-rule-type',
        consumer: 'test-consumer',
        name: 'my_rule',
        actions: [],
        muteAll: false,
        mutedInstanceIds: [],
        snoozedAlerts: [
          {
            alertInstanceId: 'alert-1',
            mutedAt: '2024-01-01T00:00:00.000Z',
            conditionOperator: 'any',
          },
        ],
      },
      references: [],
      version: 'abc',
    });

    authorizationMock.ensureAuthorized.mockRejectedValueOnce(new Error('Unauthorized'));

    await expect(
      unsnoozeInstance(context, { ruleId: 'rule-1', alertInstanceId: 'alert-1' })
    ).rejects.toThrow('Unauthorized');

    expect(auditLoggerMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'rule_alert_unsnooze',
          outcome: 'failure',
        }),
      })
    );
  });
});
