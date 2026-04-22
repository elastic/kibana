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
    getAlertSnoozeSnapshot: jest.fn(),
    muteAlertInstance: jest.fn(),
  };

  beforeEach(() => {
    getAlertIndicesAliasMock.mockReturnValue(['alert-index-1']);
    alertsServiceMock.isExistingAlert.mockResolvedValue(true);
    alertsServiceMock.getAlertSnoozeSnapshot.mockResolvedValue({ 'host.name': 'web-01' });
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

  it('writes a conditional snooze entry when a body is provided', async () => {
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
        mutedInstanceIds: ['still-muted'],
        snoozedInstances: [
          {
            instanceId: 'other-instance',
            snoozedAt: '2026-04-14T10:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
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
      query: { validateAlertsExistence: false },
      body: {
        expiresAt: '2026-04-14T12:00:00.000Z',
        conditions: [{ type: 'field_change', field: 'host.name' }],
        conditionOperator: 'all',
      },
    });

    expect(alertsServiceMock.getAlertSnoozeSnapshot).toHaveBeenCalledWith({
      indices: ['alert-index-1'],
      alertId: 'instance1',
      ruleId: '1',
      fields: ['host.name'],
    });
    expect(alertsServiceMock.isExistingAlert).not.toHaveBeenCalled();
    expect(alertsServiceMock.muteAlertInstance).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        snoozedInstances: [
          {
            instanceId: 'other-instance',
            snoozedAt: '2026-04-14T10:00:00.000Z',
            snoozedBy: 'elastic',
          },
          {
            instanceId: 'instance1',
            expiresAt: '2026-04-14T12:00:00.000Z',
            conditions: [{ type: 'field_change', field: 'host.name' }],
            conditionOperator: 'all',
            snoozeSnapshot: { 'host.name': 'web-01' },
            snoozedAt: expect.any(String),
            snoozedBy: '',
          },
        ],
        updatedAt: expect.any(String),
      },
      { version: 'v1' }
    );
  });

  it('rejects an invalid conditional snooze body', async () => {
    await expect(() =>
      muteInstance(context, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: false },
        body: {
          conditionOperator: 'all',
        } as never,
      })
    ).rejects.toThrow('Failed to validate body: [conditionOperator] requires [conditions]');

    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('rejects expiresAt that is not a full ISO 8601 date-time string', async () => {
    await expect(() =>
      muteInstance(context, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: false },
        body: {
          expiresAt: '2026-04-14',
          conditions: [{ type: 'field_change', field: 'host.name' }],
        },
      })
    ).rejects.toThrow('Failed to validate body');

    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('rejects expiresAt that is missing milliseconds (not YYYY-MM-DDTHH:mm:ss.sssZ)', async () => {
    await expect(() =>
      muteInstance(context, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: false },
        body: {
          expiresAt: '2026-04-14T12:00:00Z',
          conditions: [{ type: 'field_change', field: 'host.name' }],
        },
      })
    ).rejects.toThrow('Failed to validate body');

    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });
});
