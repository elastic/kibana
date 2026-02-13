/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client';
import { snoozeInstance } from './snooze_instance';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';

describe('snooze alert instance', () => {
  const loggerErrorMock = jest.fn();
  const savedObjectsMock = savedObjectsRepositoryMock.create();
  const unsecuredSavedObjectsClient = savedObjectsMock;
  const auditLoggerMock = { log: jest.fn() };
  const authorizationMock = { ensureAuthorized: jest.fn() };
  const actionsAuthorizationMock = { ensureAuthorized: jest.fn() };
  const ruleTypeRegistryMock = { ensureRuleTypeEnabled: jest.fn() };
  const getAlertIndicesAliasMock = jest.fn();
  const alertsServiceMock = {
    isExistingAlert: jest.fn(),
  };

  beforeEach(() => {
    getAlertIndicesAliasMock.mockReturnValue(['alert-index-1']);
    alertsServiceMock.isExistingAlert.mockResolvedValue(true);
  });

  afterEach(() => jest.clearAllMocks());

  const context = {
    logger: { error: loggerErrorMock },
    unsecuredSavedObjectsClient,
    auditLogger: auditLoggerMock,
    authorization: authorizationMock,
    actionsAuthorization: actionsAuthorizationMock,
    ruleTypeRegistry: ruleTypeRegistryMock,
    getUserName: jest.fn().mockResolvedValue('test-user'),
    getAlertIndicesAlias: getAlertIndicesAliasMock,
    alertsService: alertsServiceMock,
    spaceId: 'default',
  } as unknown as RulesClientContext;

  it('writes to snoozedAlerts with expiresAt', async () => {
    savedObjectsMock.get.mockResolvedValueOnce({
      id: 'rule-1',
      type: 'test-rule-type',
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

    await snoozeInstance(context, {
      ruleId: 'rule-1',
      alertInstanceId: 'alert-1',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });

    expect(savedObjectsMock.update).toHaveBeenCalledWith(
      'alert',
      'rule-1',
      expect.objectContaining({
        snoozedAlerts: [
          expect.objectContaining({
            alertInstanceId: 'alert-1',
            expiresAt: '2099-01-01T00:00:00.000Z',
            mutedBy: 'test-user',
            conditionOperator: 'any',
          }),
        ],
      }),
      expect.objectContaining({ version: 'abc' })
    );
  });

  it('writes to snoozedAlerts with conditions and conditionOperator', async () => {
    savedObjectsMock.get.mockResolvedValueOnce({
      id: 'rule-1',
      type: 'test-rule-type',
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

    await snoozeInstance(context, {
      ruleId: 'rule-1',
      alertInstanceId: 'alert-1',
      conditions: [
        { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'high' },
      ],
      conditionOperator: 'all',
    });

    expect(savedObjectsMock.update).toHaveBeenCalledWith(
      'alert',
      'rule-1',
      expect.objectContaining({
        snoozedAlerts: [
          expect.objectContaining({
            alertInstanceId: 'alert-1',
            conditions: [
              { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'high' },
            ],
            conditionOperator: 'all',
          }),
        ],
      }),
      expect.objectContaining({ version: 'abc' })
    );
  });

  it('replaces existing snoozedAlerts entry for the same alert instance', async () => {
    savedObjectsMock.get.mockResolvedValueOnce({
      id: 'rule-1',
      type: 'test-rule-type',
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
            expiresAt: '2024-06-01T00:00:00.000Z',
            conditionOperator: 'any',
          },
        ],
      },
      references: [],
      version: 'abc',
    });

    await snoozeInstance(context, {
      ruleId: 'rule-1',
      alertInstanceId: 'alert-1',
      expiresAt: '2099-12-31T00:00:00.000Z',
    });

    const updateCall = savedObjectsMock.update.mock.calls[0];
    const updatedSnoozedAlerts = (updateCall[2] as Record<string, unknown>).snoozedAlerts as Array<
      Record<string, unknown>
    >;
    expect(updatedSnoozedAlerts).toHaveLength(1);
    expect(updatedSnoozedAlerts[0].expiresAt).toBe('2099-12-31T00:00:00.000Z');
  });

  it('throws when alert does not exist', async () => {
    savedObjectsMock.get.mockResolvedValueOnce({
      id: 'rule-1',
      type: 'test-rule-type',
      attributes: {
        alertTypeId: 'test-rule-type',
        consumer: 'test-consumer',
        actions: [],
        muteAll: false,
        mutedInstanceIds: [],
      },
      references: [],
      version: 'abc',
    });

    alertsServiceMock.isExistingAlert.mockResolvedValue(false);

    await expect(
      snoozeInstance(context, {
        ruleId: 'rule-1',
        alertInstanceId: 'nonexistent-alert',
      })
    ).rejects.toThrow('does not exist');
  });

  it('logs audit event with SNOOZE_ALERT action on success', async () => {
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
        snoozedAlerts: [],
      },
      references: [],
      version: 'abc',
    });

    await snoozeInstance(context, {
      ruleId: 'rule-1',
      alertInstanceId: 'alert-1',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });

    expect(auditLoggerMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'rule_alert_snooze',
          outcome: 'unknown',
        }),
      })
    );
  });

  it('logs audit event and throws when authorization fails', async () => {
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
        snoozedAlerts: [],
      },
      references: [],
      version: 'abc',
    });

    authorizationMock.ensureAuthorized.mockRejectedValueOnce(new Error('Unauthorized'));

    await expect(
      snoozeInstance(context, {
        ruleId: 'rule-1',
        alertInstanceId: 'alert-1',
      })
    ).rejects.toThrow('Unauthorized');

    expect(auditLoggerMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'rule_alert_snooze',
          outcome: 'failure',
        }),
      })
    );
  });

  it('throws RuleTypeDisabledError when rule type is disabled', async () => {
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
        snoozedAlerts: [],
      },
      references: [],
      version: 'abc',
    });

    ruleTypeRegistryMock.ensureRuleTypeEnabled.mockImplementationOnce(() => {
      throw new Error('Rule type is disabled');
    });

    await expect(
      snoozeInstance(context, {
        ruleId: 'rule-1',
        alertInstanceId: 'alert-1',
      })
    ).rejects.toThrow('Rule type is disabled');
  });
});
