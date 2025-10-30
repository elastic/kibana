/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConstructorOptions } from '../rules_client';
import { RulesClient } from '../rules_client';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import type { AlertingAuthorization } from '../../authorization/alerting_authorization';
import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from './lib';
import { ConnectorAdapterRegistry } from '../../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { backfillClientMock } from '../../backfill_client/backfill_client.mock';
import { ALERT_MUTED, ALERT_INSTANCE_ID, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const kibanaVersion = 'v7.10.0';
const elasticsearchClient = {
  updateByQuery: jest.fn().mockResolvedValue({ updated: 1 }),
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
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
  elasticsearchClient: elasticsearchClient as any,
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
  elasticsearchClient.updateByQuery.mockClear();
  (rulesClientParams.getAlertIndicesAlias as jest.Mock).mockReturnValue(['.alerts-default']);
});

setGlobalDate();

describe('muteInstance()', () => {
  test('mutes an alert instance', async () => {
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
      version: '123',
      references: [],
    });

    await rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' });

    expect(elasticsearchClient.updateByQuery).toHaveBeenCalledWith({
      index: ['.alerts-default'],
      conflicts: 'proceed',
      refresh: true,
      query: {
        bool: {
          must: [{ term: { [ALERT_INSTANCE_ID]: '2' } }, { term: { [ALERT_RULE_UUID]: '1' } }],
        },
      },
      script: {
        source: `ctx._source['${ALERT_MUTED}'] = true;`,
        lang: 'painless',
      },
    });

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        mutedInstanceIds: ['2'],
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
      },
      {
        version: '123',
      }
    );
  });

  test('skips muting when alert instance already muted', async () => {
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
      references: [],
    });

    await rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(elasticsearchClient.updateByQuery).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
  });

  test('skips muting when alert is muted', async () => {
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

    await rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(elasticsearchClient.updateByQuery).not.toHaveBeenCalled();
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
          schedule: { interval: '10s' },
          alertTypeId: 'myType',
          consumer: 'myApp',
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: [],
        },
        version: '123',
        references: [],
      });
    });

    test('ensures user is authorised to muteInstance this type of alert under the consumer', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      await rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' });

      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'execute' });
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'muteAlert',
        ruleTypeId: 'myType',
      });
    });

    test('throws when user is not authorised to muteInstance this type of alert', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to muteAlert a "myType" alert for "myApp"`)
      );

      await expect(
        rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to muteAlert a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'muteAlert',
        ruleTypeId: 'myType',
      });
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when muting an alert', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
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
        version: '123',
        references: [],
      });
      await rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_alert_mute',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE } },
        })
      );
    });

    test('logs audit event when not authorised to mute an alert', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
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
        version: '123',
        references: [],
      });
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' })
      ).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_alert_mute',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: '1',
              type: RULE_SAVED_OBJECT_TYPE,
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
          mutedInstanceIds: [],
        },
        version: '123',
        references: [],
      });

      await rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' });

      expect(elasticsearchClient.updateByQuery).not.toHaveBeenCalled();
      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
    });

    test('logs error but continues when ES updateByQuery fails', async () => {
      const loggerMock = loggingSystemMock.create().get();
      const rulesClient = new RulesClient({ ...rulesClientParams, logger: loggerMock });
      elasticsearchClient.updateByQuery.mockRejectedValueOnce(new Error('ES connection failed'));
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
        version: '123',
        references: [],
      });

      await rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' });

      expect(loggerMock.error).toHaveBeenCalledWith(
        'Error updating muted field for alert instance 2: ES connection failed'
      );
      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
    });
  });
});
