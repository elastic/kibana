/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { RulesClientContext } from '../../../../rules_client';
import { unsnoozeAlertInstance } from './unsnooze_instance';

describe('unsnooze alert instance', () => {
  const savedObjectsMock = savedObjectsRepositoryMock.create();
  const auditLoggerMock = { log: jest.fn() };
  const authorizationMock = { ensureAuthorized: jest.fn() };
  const actionsAuthorizationMock = { ensureAuthorized: jest.fn() };
  const ruleTypeRegistryMock = { ensureRuleTypeEnabled: jest.fn() };

  afterEach(() => {
    jest.resetAllMocks();
  });

  const context = {
    logger: { error: jest.fn() },
    unsecuredSavedObjectsClient: savedObjectsMock,
    authorization: authorizationMock,
    actionsAuthorization: actionsAuthorizationMock,
    auditLogger: auditLoggerMock,
    ruleTypeRegistry: ruleTypeRegistryMock,
    getUserName: async () => 'elastic',
  } as unknown as RulesClientContext;

  it('removes only the targeted per-alert snooze entry', async () => {
    savedObjectsMock.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        name: 'test rule',
        alertTypeId: '123',
        consumer: 'alerts',
        schedule: { interval: '10s' },
        params: { bar: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [],
        notifyWhen: 'onActiveAlert',
        mutedInstanceIds: ['still-muted'],
        snoozedInstances: [
          {
            instanceId: 'instance1',
            snoozedAt: '2026-04-14T10:00:00.000Z',
            snoozedBy: 'elastic',
          },
          {
            instanceId: 'instance2',
            snoozedAt: '2026-04-14T11:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
      },
      references: [],
      version: 'v1',
    });

    await unsnoozeAlertInstance(context, { alertId: '1', alertInstanceId: 'instance1' });

    expect(savedObjectsMock.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        snoozedInstances: [
          {
            instanceId: 'instance2',
            snoozedAt: '2026-04-14T11:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
        updatedBy: 'elastic',
        updatedAt: expect.any(String),
      },
      { version: 'v1' }
    );
  });

  it('does not update the rule when no matching snooze entry exists', async () => {
    savedObjectsMock.get.mockResolvedValueOnce({
      id: '1',
      type: 'test-rule-type',
      attributes: {
        name: 'test rule',
        alertTypeId: '123',
        consumer: 'alerts',
        schedule: { interval: '10s' },
        params: { bar: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [],
        notifyWhen: 'onActiveAlert',
        snoozedInstances: [
          {
            instanceId: 'instance2',
            snoozedAt: '2026-04-14T11:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
      },
      references: [],
    });

    await unsnoozeAlertInstance(context, { alertId: '1', alertInstanceId: 'missing-instance' });

    expect(savedObjectsMock.update).not.toHaveBeenCalled();
  });
});
