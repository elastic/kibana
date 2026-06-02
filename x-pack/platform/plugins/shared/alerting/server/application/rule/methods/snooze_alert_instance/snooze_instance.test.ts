/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client';
import { snoozeAlertInstance } from './snooze_instance';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import { AlertAuditAction } from '../../../../lib/alert_audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

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

  it('writes a conditional snooze entry', async () => {
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

    await snoozeAlertInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { validateAlertsExistence: false },
      body: {
        expiresAt: '2099-12-31T23:59:59.000Z',
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
            expiresAt: '2099-12-31T23:59:59.000Z',
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

  it('validates alerts existence when validateAlertsExistence is true and no snapshot fields', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: { bar: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [],
        notifyWhen: 'onActiveAlert',
      },
      references: [],
      version: 'v1',
    });

    alertsServiceMock.isExistingAlert.mockResolvedValueOnce(true);

    await snoozeAlertInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { validateAlertsExistence: true },
      body: {
        expiresAt: '2099-12-31T23:59:59.000Z',
      },
    });

    expect(alertsServiceMock.isExistingAlert).toHaveBeenCalledTimes(1);
  });

  it('rejects conditionOperator when conditions are absent', async () => {
    await expect(() =>
      snoozeAlertInstance(context, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: false },
        body: {
          conditionOperator: 'all',
        } as never,
      })
    ).rejects.toThrow('Failed to validate body: [conditionOperator] requires [conditions]');

    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('rejects a body with neither expiresAt nor conditions', async () => {
    await expect(() =>
      snoozeAlertInstance(context, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: false },
        body: {} as never,
      })
    ).rejects.toThrow(
      'Failed to validate body: either [expiresAt] or [conditions] must be provided'
    );

    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('defaults conditionOperator to "any" when conditions are provided without an operator', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        alertTypeId: '123',
        consumer: 'test-consumer',
        schedule: { interval: '10s' },
        params: { bar: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [],
        notifyWhen: 'onActiveAlert',
        mutedInstanceIds: [],
        snoozedInstances: [],
      },
      references: [],
      version: 'v1',
    });

    await snoozeAlertInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { validateAlertsExistence: false },
      body: {
        expiresAt: '2099-12-31T23:59:59.000Z',
        conditions: [{ type: 'severity_change' }],
        conditionOperator: 'any',
      },
    });

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        snoozedInstances: expect.arrayContaining([
          expect.objectContaining({ conditionOperator: 'any' }),
        ]),
      }),
      expect.any(Object)
    );
  });

  it('rejects expiresAt that is in the past', async () => {
    await expect(() =>
      snoozeAlertInstance(context, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: false },
        body: {
          expiresAt: '2020-01-01T00:00:00.000Z',
        },
      })
    ).rejects.toThrow('Failed to validate body: [expiresAt] must be in the future');

    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('throws 500 when alertsService is null and snapshot fields are required', async () => {
    const contextWithoutAlertsService = {
      ...context,
      alertsService: null,
    } as unknown as RulesClientContext;

    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: { bar: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [],
        notifyWhen: 'onActiveAlert',
      },
      references: [],
      version: 'v1',
    });

    await expect(() =>
      snoozeAlertInstance(contextWithoutAlertsService, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: false },
        body: {
          expiresAt: '2099-12-31T23:59:59.000Z',
          conditions: [{ type: 'field_change', field: 'host.name' }],
          conditionOperator: 'any',
        },
      })
    ).rejects.toThrow('Alerts service is unavailable');

    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('throws 500 when alertsService is null and validateAlertsExistence is true', async () => {
    const contextWithoutAlertsService = {
      ...context,
      alertsService: null,
    } as unknown as RulesClientContext;

    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: { bar: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [],
        notifyWhen: 'onActiveAlert',
      },
      references: [],
      version: 'v1',
    });

    await expect(() =>
      snoozeAlertInstance(contextWithoutAlertsService, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: true },
        body: {
          expiresAt: '2099-12-31T23:59:59.000Z',
        },
      })
    ).rejects.toThrow('Alerts service is unavailable');

    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('rejects expiresAt that is not a full ISO 8601 date-time string', async () => {
    await expect(() =>
      snoozeAlertInstance(context, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: false },
        body: {
          expiresAt: '2026-04-14',
          conditions: [{ type: 'field_change', field: 'host.name' }],
          conditionOperator: 'any',
        },
      })
    ).rejects.toThrow('Failed to validate body');

    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('rejects expiresAt that is missing milliseconds (not YYYY-MM-DDTHH:mm:ss.sssZ)', async () => {
    await expect(() =>
      snoozeAlertInstance(context, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: false },
        body: {
          expiresAt: '2026-04-14T12:00:00Z',
          conditions: [{ type: 'field_change', field: 'host.name' }],
          conditionOperator: 'any',
        },
      })
    ).rejects.toThrow('Failed to validate body');

    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('logs an alert_snooze audit event before the SO update', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        name: 'my rule',
        alertTypeId: '123',
        consumer: 'test-consumer',
        schedule: { interval: '10s' },
        params: { bar: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [],
        notifyWhen: 'onActiveAlert',
        mutedInstanceIds: [],
        snoozedInstances: [],
      },
      references: [],
      version: 'v1',
    });

    await snoozeAlertInstance(context, {
      params: { alertId: '1', alertInstanceId: 'instance1' },
      query: { validateAlertsExistence: false },
      body: { expiresAt: '2099-12-31T23:59:59.000Z' },
    });

    expect(auditLoggerMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: AlertAuditAction.SNOOZE,
          outcome: 'unknown',
        }),
        kibana: expect.objectContaining({
          saved_object: { type: RULE_SAVED_OBJECT_TYPE, id: '1', name: 'my rule' },
        }),
        message: 'User is snoozing alert [id=instance1] of rule [id=1] and [name=my rule]',
      })
    );
  });

  it('logs an alert_snooze failure audit event when authorization fails', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        name: 'my rule',
        alertTypeId: '123',
        consumer: 'test-consumer',
        schedule: { interval: '10s' },
        params: { bar: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [],
        notifyWhen: 'onActiveAlert',
      },
      references: [],
      version: 'v1',
    });

    const authError = new Error('Unauthorized');
    authorizationMock.ensureAuthorized.mockRejectedValueOnce(authError);

    await expect(() =>
      snoozeAlertInstance(context, {
        params: { alertId: '1', alertInstanceId: 'instance1' },
        query: { validateAlertsExistence: false },
        body: { expiresAt: '2099-12-31T23:59:59.000Z' },
      })
    ).rejects.toThrow('Unauthorized');

    expect(auditLoggerMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: AlertAuditAction.SNOOZE,
          outcome: 'failure',
        }),
        kibana: expect.objectContaining({
          saved_object: { type: RULE_SAVED_OBJECT_TYPE, id: '1', name: 'my rule' },
        }),
      })
    );
  });
});
