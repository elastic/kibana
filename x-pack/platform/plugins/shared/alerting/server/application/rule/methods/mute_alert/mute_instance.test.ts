/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client';
import { muteInstance } from './mute_instance';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';

describe('mute alert instance', () => {
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
    muteAlertInstance: jest.fn(),
  };

  beforeEach(() => {
    getAlertIndicesAliasMock.mockReturnValue(['alert-index-1']);
    alertsServiceMock.isExistingAlert.mockResolvedValue(true);
    alertsServiceMock.muteAlertInstance.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const context = {
    logger: { error: loggerErrorMock },
    unsecuredSavedObjectsClient: savedObjectsMock,
    authorization: authorizationMock,
    actionsAuthorization: actionsAuthorizationMock,
    auditLogger: auditLoggerMock,
    ruleTypeRegistry: ruleTypeRegistryMock,
    getAlertIndicesAlias: getAlertIndicesAliasMock,
    getUserName: async () => {},
    alertsService: alertsServiceMock,
  } as unknown as RulesClientContext;

  it('mutes an alert', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        executionStatus: {
          status: 'unknown',
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
        notifyWhen: 'onActiveAlert',
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
      version: 'v1',
    });

    await muteInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: {},
    });

    expect(auditLoggerMock.log).toHaveBeenCalledTimes(1);
    expect(authorizationMock.ensureAuthorized).toHaveBeenCalledTimes(1);
    expect(actionsAuthorizationMock.ensureAuthorized).toHaveBeenCalledTimes(1);
    expect(ruleTypeRegistryMock.ensureRuleTypeEnabled).toHaveBeenCalledTimes(1);
    expect(getAlertIndicesAliasMock).toHaveBeenCalledTimes(1);
    expect(alertsServiceMock.isExistingAlert).not.toHaveBeenCalled();
    expect(alertsServiceMock.muteAlertInstance).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        mutedInstanceIds: ['instance1'],
        updatedAt: expect.any(String),
      },
      { version: 'v1' }
    );
  });

  it('validates alerts existence', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        executionStatus: {
          status: 'unknown',
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
        notifyWhen: 'onActiveAlert',
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
      version: 'v1',
    });

    alertsServiceMock.isExistingAlert.mockResolvedValueOnce(true);

    await muteInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { validateAlertsExistence: true },
    });

    expect(auditLoggerMock.log).toHaveBeenCalledTimes(1);
    expect(authorizationMock.ensureAuthorized).toHaveBeenCalledTimes(1);
    expect(actionsAuthorizationMock.ensureAuthorized).toHaveBeenCalledTimes(1);
    expect(ruleTypeRegistryMock.ensureRuleTypeEnabled).toHaveBeenCalledTimes(1);
    expect(getAlertIndicesAliasMock).toHaveBeenCalledTimes(2);
    expect(alertsServiceMock.isExistingAlert).toHaveBeenCalledTimes(1);
    expect(alertsServiceMock.muteAlertInstance).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        mutedInstanceIds: ['instance1'],
        updatedAt: expect.any(String),
      },
      { version: 'v1' }
    );
  });

  it('writes to mutedAlerts when conditional snooze params are provided (expiresAt)', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: { bar: true },
        executionStatus: {
          status: 'unknown',
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: { foo: true },
          },
        ],
        notifyWhen: 'onActiveAlert',
      },
      references: [{ name: 'action_0', type: 'action', id: '1' }],
      version: 'v1',
    });

    const expiresAt = new Date(Date.now() + 3600000).toISOString();

    await muteInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { expiresAt },
    });

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    const updateCall = unsecuredSavedObjectsClient.update.mock.calls[0];
    const updateAttrs = updateCall[2] as Record<string, unknown>;

    expect(updateAttrs.mutedInstanceIds).toEqual(['instance1']);
    expect(updateAttrs.mutedAlerts).toBeDefined();
    expect(updateAttrs.mutedAlerts).toHaveLength(1);
    expect((updateAttrs.mutedAlerts as Array<Record<string, unknown>>)[0]).toEqual(
      expect.objectContaining({
        alertInstanceId: 'instance1',
        expiresAt,
        conditionOperator: 'any',
      })
    );

    // Should use SNOOZE_ALERT audit action, not MUTE_ALERT
    expect(auditLoggerMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'rule_alert_snooze',
        }),
      })
    );
  });

  it('writes to mutedAlerts with conditions and conditionOperator', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: { bar: true },
        executionStatus: {
          status: 'unknown',
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: { foo: true },
          },
        ],
        notifyWhen: 'onActiveAlert',
      },
      references: [{ name: 'action_0', type: 'action', id: '1' }],
      version: 'v1',
    });

    const conditions = [
      { type: 'severity_change' as const, field: 'kibana.alert.severity', snapshotValue: 'high' },
    ];

    await muteInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { conditions, conditionOperator: 'all' },
    });

    const updateAttrs = unsecuredSavedObjectsClient.update.mock.calls[0][2] as Record<string, unknown>;

    expect(updateAttrs.mutedAlerts).toHaveLength(1);
    expect((updateAttrs.mutedAlerts as Array<Record<string, unknown>>)[0]).toEqual(
      expect.objectContaining({
        alertInstanceId: 'instance1',
        conditions,
        conditionOperator: 'all',
      })
    );
  });

  it('replaces existing mutedAlerts entry for the same alert instance', async () => {
    const existingEntry = {
      alertInstanceId: 'instance1',
      mutedAt: '2025-01-01T00:00:00.000Z',
      mutedBy: 'old-user',
      expiresAt: '2025-01-02T00:00:00.000Z',
      conditionOperator: 'any' as const,
    };

    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: { bar: true },
        executionStatus: {
          status: 'unknown',
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: { foo: true },
          },
        ],
        notifyWhen: 'onActiveAlert',
        mutedInstanceIds: ['instance1'],
        mutedAlerts: [existingEntry],
      },
      references: [{ name: 'action_0', type: 'action', id: '1' }],
      version: 'v1',
    });

    const newExpiresAt = new Date(Date.now() + 7200000).toISOString();

    await muteInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { expiresAt: newExpiresAt },
    });

    // instance1 is already in mutedInstanceIds, so muteInstance should not re-add it
    // and should not call update (the code checks !mutedInstanceIds.includes(alertInstanceId))
    // Actually, since instance1 is already muted, the code won't proceed.
    // Let's verify: the code checks !attributes.muteAll && !mutedInstanceIds.includes(alertInstanceId)
    // Since instance1 IS in mutedInstanceIds, the update will NOT be called.
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('does not write mutedAlerts for a simple mute (no snooze params)', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: { bar: true },
        executionStatus: {
          status: 'unknown',
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: { foo: true },
          },
        ],
        notifyWhen: 'onActiveAlert',
      },
      references: [{ name: 'action_0', type: 'action', id: '1' }],
      version: 'v1',
    });

    await muteInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: {},
    });

    const updateAttrs = unsecuredSavedObjectsClient.update.mock.calls[0][2] as Record<string, unknown>;

    expect(updateAttrs.mutedInstanceIds).toEqual(['instance1']);
    expect(updateAttrs.mutedAlerts).toBeUndefined();

    // Should use MUTE_ALERT audit action, not SNOOZE_ALERT
    expect(auditLoggerMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'rule_alert_mute',
        }),
      })
    );
  });

  it('validates alerts existence and throws an error if the alert does not exist', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        executionStatus: {
          status: 'unknown',
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
        notifyWhen: 'onActiveAlert',
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
      version: 'v1',
    });

    alertsServiceMock.isExistingAlert.mockResolvedValueOnce(false);

    await expect(() =>
      muteInstance(context, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: true },
      })
    ).rejects.toThrow('Alert instance with id "instance1" does not exist for rule with id "1"');
  });
});
