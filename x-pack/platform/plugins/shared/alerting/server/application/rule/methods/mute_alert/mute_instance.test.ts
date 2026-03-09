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
    snoozeAlertInstance: jest.fn(),
  };

  beforeEach(() => {
    getAlertIndicesAliasMock.mockReturnValue(['alert-index-1']);
    alertsServiceMock.isExistingAlert.mockResolvedValue(true);
    alertsServiceMock.muteAlertInstance.mockResolvedValue(undefined);
    alertsServiceMock.snoozeAlertInstance.mockResolvedValue(undefined);
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
    expect(getAlertIndicesAliasMock).toHaveBeenCalledTimes(1);
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

  it('calls snoozeAlertInstance when body contains conditions', async () => {
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
        actions: [{ group: 'default', actionRef: 'action_0', params: { foo: true } }],
        consumer: 'bar',
        mutedInstanceIds: [],
        notifyWhen: 'onActiveAlert',
      },
      references: [{ name: 'action_0', type: 'action', id: '1' }],
      version: 'v1',
    });

    await muteInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { validateAlertsExistence: false },
      body: {
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        conditions: [
          {
            type: 'severity_equals',
            field: 'kibana.alert.severity',
            value: 'low',
          },
        ],
        conditionOperator: 'any',
      },
    });

    expect(alertsServiceMock.snoozeAlertInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: '1',
        alertInstanceId: 'instance1',
        expiresAt: expect.any(String),
        conditions: [
          expect.objectContaining({
            type: 'severity_equals',
            field: 'kibana.alert.severity',
            value: 'low',
          }),
        ],
        conditionOperator: 'any',
      })
    );
    expect(alertsServiceMock.muteAlertInstance).not.toHaveBeenCalled();

    // Conditional snooze writes snoozedInstances to the rule SO
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      expect.objectContaining({
        snoozedInstances: [
          expect.objectContaining({
            instanceId: 'instance1',
            expiresAt: expect.any(String),
            conditions: expect.any(Array),
          }),
        ],
        updatedAt: expect.any(String),
      }),
      { version: 'v1' }
    );
  });

  it('stores conditionOperator default when not explicitly provided', async () => {
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
        actions: [{ group: 'default', actionRef: 'action_0', params: { foo: true } }],
        consumer: 'bar',
        mutedInstanceIds: [],
        notifyWhen: 'onActiveAlert',
      },
      references: [{ name: 'action_0', type: 'action', id: '1' }],
      version: 'v1',
    });

    await muteInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { validateAlertsExistence: false },
      body: {
        conditions: [
          {
            type: 'severity_equals',
            field: 'kibana.alert.severity',
            value: 'low',
          },
        ],
        // conditionOperator intentionally omitted
      },
    });

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      expect.objectContaining({
        snoozedInstances: [
          expect.objectContaining({
            instanceId: 'instance1',
            conditionOperator: 'any',
          }),
        ],
      }),
      { version: 'v1' }
    );
  });

  it('removes stale mutedInstanceIds when transitioning from simple mute to conditional snooze', async () => {
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
        actions: [{ group: 'default', actionRef: 'action_0', params: { foo: true } }],
        consumer: 'bar',
        mutedInstanceIds: ['instance1', 'instance2'],
        notifyWhen: 'onActiveAlert',
      },
      references: [{ name: 'action_0', type: 'action', id: '1' }],
      version: 'v1',
    });

    await muteInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { validateAlertsExistence: false },
      body: {
        conditions: [
          {
            type: 'field_change',
            field: 'kibana.alert.severity',
            snapshotValue: 'critical',
          },
        ],
      },
    });

    expect(alertsServiceMock.snoozeAlertInstance).toHaveBeenCalledTimes(1);
    expect(alertsServiceMock.muteAlertInstance).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      expect.objectContaining({
        mutedInstanceIds: ['instance2'],
        snoozedInstances: [
          expect.objectContaining({
            instanceId: 'instance1',
            conditions: expect.any(Array),
          }),
        ],
        updatedAt: expect.any(String),
      }),
      { version: 'v1' }
    );
  });

  it('throws not found when conditional snooze is requested with no alert indices and validation enabled', async () => {
    getAlertIndicesAliasMock.mockReturnValueOnce([]);
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
        actions: [{ group: 'default', actionRef: 'action_0', params: { foo: true } }],
        consumer: 'bar',
        mutedInstanceIds: ['instance1'],
        notifyWhen: 'onActiveAlert',
      },
      references: [{ name: 'action_0', type: 'action', id: '1' }],
      version: 'v1',
    });
    alertsServiceMock.isExistingAlert.mockResolvedValueOnce(false);

    await expect(() =>
      muteInstance(context, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: true },
        body: {
          conditions: [
            {
              type: 'severity_equals',
              field: 'kibana.alert.severity',
              value: 'low',
            },
          ],
        },
      })
    ).rejects.toThrow('Alert instance with id "instance1" does not exist for rule with id "1"');

    expect(alertsServiceMock.snoozeAlertInstance).not.toHaveBeenCalled();
    expect(alertsServiceMock.isExistingAlert).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('persists conditional snooze when no alert indices are available and validation is disabled', async () => {
    getAlertIndicesAliasMock.mockReturnValueOnce([]);
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
        actions: [{ group: 'default', actionRef: 'action_0', params: { foo: true } }],
        consumer: 'bar',
        mutedInstanceIds: ['instance1'],
        notifyWhen: 'onActiveAlert',
      },
      references: [{ name: 'action_0', type: 'action', id: '1' }],
      version: 'v1',
    });

    await muteInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { validateAlertsExistence: false },
      body: {
        conditions: [
          {
            type: 'severity_equals',
            field: 'kibana.alert.severity',
            value: 'low',
          },
        ],
      },
    });

    expect(alertsServiceMock.isExistingAlert).not.toHaveBeenCalled();
    expect(alertsServiceMock.snoozeAlertInstance).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      expect.objectContaining({
        mutedInstanceIds: [],
        snoozedInstances: [
          expect.objectContaining({
            instanceId: 'instance1',
            conditions: expect.any(Array),
          }),
        ],
        updatedAt: expect.any(String),
      }),
      { version: 'v1' }
    );
  });

  it('throws when conditional snooze is requested while rule is muted via muteAll', async () => {
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
        actions: [{ group: 'default', actionRef: 'action_0', params: { foo: true } }],
        consumer: 'bar',
        mutedInstanceIds: ['instance1'],
        muteAll: true,
        notifyWhen: 'onActiveAlert',
      },
      references: [{ name: 'action_0', type: 'action', id: '1' }],
      version: 'v1',
    });

    await expect(() =>
      muteInstance(context, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: false },
        body: {
          conditions: [
            {
              type: 'field_change',
              field: 'kibana.alert.severity',
              snapshotValue: 'critical',
            },
          ],
        },
      })
    ).rejects.toThrow('muted via muteAll');

    expect(getAlertIndicesAliasMock).not.toHaveBeenCalled();
    expect(alertsServiceMock.snoozeAlertInstance).not.toHaveBeenCalled();
    expect(alertsServiceMock.isExistingAlert).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('calls muteAlertInstance when body is absent (simple mute)', async () => {
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
        actions: [{ group: 'default', actionRef: 'action_0', params: { foo: true } }],
        consumer: 'bar',
        mutedInstanceIds: [],
        notifyWhen: 'onActiveAlert',
      },
      references: [{ name: 'action_0', type: 'action', id: '1' }],
      version: 'v1',
    });

    await muteInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { validateAlertsExistence: false },
    });

    expect(alertsServiceMock.muteAlertInstance).toHaveBeenCalled();
    expect(alertsServiceMock.snoozeAlertInstance).not.toHaveBeenCalled();
  });

  it('uses SNOOZE_ALERT audit action when body contains conditions', async () => {
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
        actions: [],
        consumer: 'bar',
        mutedInstanceIds: [],
        notifyWhen: 'onActiveAlert',
      },
      references: [],
      version: 'v1',
    });

    await muteInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { validateAlertsExistence: false },
      body: {
        conditions: [
          {
            type: 'field_change',
            field: 'kibana.alert.severity',
            snapshotValue: 'critical',
          },
        ],
      },
    });

    expect(auditLoggerMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'rule_alert_snooze',
        }),
      })
    );
  });
});
