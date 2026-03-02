/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConstructorOptions } from '../../../../rules_client/rules_client';
import { RulesClient } from '../../../../rules_client/rules_client';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
  coreFeatureFlagsMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import type { AlertingAuthorization } from '../../../../authorization/alerting_authorization';
import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';
import type { AlertsService } from '../../../../alerts_service';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const kibanaVersion = 'v7.10.0';
const alertsService = {
  muteAlertInstance: jest.fn(),
  clearSnoozeAndUnmuteAlertInstances: jest.fn(),
};
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn().mockReturnValue(['.alerts-default']),
  alertsService: alertsService as unknown as AlertsService,
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
  featureFlags: coreFeatureFlagsMock.createStart(),
  isServerless: false,
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
  alertsService.muteAlertInstance.mockClear();
  alertsService.clearSnoozeAndUnmuteAlertInstances.mockClear();
  (rulesClientParams.getAlertIndicesAlias as jest.Mock).mockReturnValue(['.alerts-default']);
});

setGlobalDate();

describe('unmuteInstance()', () => {
  test('unmutes an alert instance', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: ['2'],
      },
      version: '123',
      references: [],
    });

    await rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });

    expect(alertsService.clearSnoozeAndUnmuteAlertInstances).toHaveBeenCalledWith({
      ruleId: '1',
      alertInstanceIds: ['2'],
      indices: ['.alerts-default'],
      logger: rulesClientParams.logger,
    });

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        mutedInstanceIds: [],
        updatedBy: 'elastic',
        updatedAt: '2019-02-12T21:01:22.479Z',
      },
      { version: '123' }
    );
  });

  test('cancels conditional snooze when alert instance not in mutedInstanceIds', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
        snoozedInstances: [
          { instanceId: '2', expiresAt: new Date(Date.now() + 86400000).toISOString() },
        ],
      },
      version: '123',
      references: [],
    });

    await rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(alertsService.clearSnoozeAndUnmuteAlertInstances).toHaveBeenCalledWith({
      ruleId: '1',
      alertInstanceIds: ['2'],
      indices: ['.alerts-default'],
      logger: rulesClientParams.logger,
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      expect.objectContaining({
        snoozedInstances: [],
        updatedAt: expect.any(String),
      }),
      { version: '123' }
    );
  });

  test('unmutes both simple mute and conditional snooze in a single rule SO update', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: ['2', '3'],
        snoozedInstances: [
          { instanceId: '2', expiresAt: new Date(Date.now() + 86400000).toISOString() },
        ],
      },
      version: '123',
      references: [],
    });

    await rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      expect.objectContaining({
        mutedInstanceIds: ['3'],
        snoozedInstances: [],
        updatedAt: expect.any(String),
      }),
      { version: '123' }
    );
  });

  test('skips unmuting when alert instance not muted and not snoozed', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
      },
      references: [],
    });

    await rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(alertsService.clearSnoozeAndUnmuteAlertInstances).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  test('skips unmuting when alert is muted', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
        muteAll: true,
      },
      references: [],
    });

    await rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(alertsService.clearSnoozeAndUnmuteAlertInstances).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          actions: [
            {
              group: 'default',
              id: '1',
              actionTypeId: '1',
              actionRef: '1',
              params: {
                foo: true,
              },
            },
          ],
          alertTypeId: 'myType',
          consumer: 'myApp',
          schedule: { interval: '10s' },
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: ['2'],
        },
        version: '123',
        references: [],
      });
    });

    test('ensures user is authorised to unmuteInstance this type of alert under the consumer', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      await rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });

      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'execute' });
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'unmuteAlert',
        ruleTypeId: 'myType',
      });
    });

    test('throws when user is not authorised to unmuteInstance this type of alert', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to unmuteAlert a "myType" alert for "myApp"`)
      );

      await expect(
        rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to unmuteAlert a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'unmuteAlert',
        ruleTypeId: 'myType',
      });
    });

    test('throws an error if API params do not match the schema', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      await expect(
        // @ts-expect-error: Wrong params for testing purposes
        rulesClient.unmuteInstance({ alertId: 1 })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to validate params: [alertId]: expected value of type [string] but got [number]"`
      );
      expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    });
  });

  describe('auditLogger', () => {
    test('logs UNMUTE_ALERT audit event when unmuting a simple-muted alert', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'fake_rule_name',
          actions: [],
          schedule: { interval: '10s' },
          alertTypeId: '2',
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: ['2'],
        },
        version: '123',
        references: [],
      });
      await rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_alert_unmute',
            outcome: 'unknown',
          }),
          kibana: {
            saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'fake_rule_name' },
          },
        })
      );
    });

    test('logs UNMUTE_ALERT audit event when muteAll short-circuits unmute', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'fake_rule_name',
          actions: [],
          schedule: { interval: '10s' },
          alertTypeId: '2',
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: [],
          muteAll: true,
        },
        version: '123',
        references: [],
      });

      await rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_alert_unmute',
            outcome: 'unknown',
          }),
          kibana: {
            saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'fake_rule_name' },
          },
        })
      );
      expect(alertsService.clearSnoozeAndUnmuteAlertInstances).not.toHaveBeenCalled();
      expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    });

    test('logs UNSNOOZE_ALERT audit event when cancelling a conditional snooze', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'fake_rule_name',
          actions: [],
          schedule: { interval: '10s' },
          alertTypeId: '2',
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: [],
          snoozedInstances: [
            { instanceId: '2', expiresAt: new Date(Date.now() + 86400000).toISOString() },
          ],
        },
        version: '123',
        references: [],
      });
      await rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_alert_unsnooze',
            outcome: 'unknown',
          }),
          kibana: {
            saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'fake_rule_name' },
          },
        })
      );
      expect(alertsService.clearSnoozeAndUnmuteAlertInstances).toHaveBeenCalledWith({
        ruleId: '1',
        alertInstanceIds: ['2'],
        indices: ['.alerts-default'],
        logger: rulesClientParams.logger,
      });
      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        '1',
        expect.objectContaining({
          snoozedInstances: [],
          updatedAt: expect.any(String),
        }),
        { version: '123' }
      );
    });

    test('logs UNMUTE_ALERT failure audit event when not authorised for simple unmute', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'fake_rule_name',
          actions: [],
          schedule: { interval: '10s' },
          alertTypeId: '2',
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: ['2'],
        },
        version: '123',
        references: [],
      });
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' })
      ).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_alert_unmute',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: '1',
              type: RULE_SAVED_OBJECT_TYPE,
              name: 'fake_rule_name',
            },
          },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });

    test('logs UNSNOOZE_ALERT failure audit event when not authorised for snooze cancel', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'fake_rule_name',
          actions: [],
          schedule: { interval: '10s' },
          alertTypeId: '2',
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: [],
        },
        version: '123',
        references: [],
      });
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' })
      ).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_alert_unsnooze',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: '1',
              type: RULE_SAVED_OBJECT_TYPE,
              name: 'fake_rule_name',
            },
          },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });
  });

  describe('elasticsearch operations', () => {
    test('does not call ES updateByQuery when no alert indices exist', async () => {
      (rulesClientParams.getAlertIndicesAlias as jest.Mock).mockReturnValue([]);
      const rulesClient = new RulesClient(rulesClientParams);
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          actions: [],
          schedule: { interval: '10s' },
          alertTypeId: '2',
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: ['2'],
        },
        version: '123',
        references: [],
      });

      await rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });

      expect(alertsService.clearSnoozeAndUnmuteAlertInstances).not.toHaveBeenCalled();
      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
    });

    test('throws error but still updates rule when alertsService fails', async () => {
      const loggerMock = loggingSystemMock.create().get();
      const rulesClient = new RulesClient({ ...rulesClientParams, logger: loggerMock });
      alertsService.clearSnoozeAndUnmuteAlertInstances.mockRejectedValueOnce(
        new Error('ES connection failed')
      );
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          actions: [],
          schedule: { interval: '10s' },
          alertTypeId: '2',
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: ['2'],
        },
        version: '123',
        references: [],
      });

      await expect(
        rulesClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' })
      ).rejects.toThrow('ES connection failed');

      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
    });
  });
});
