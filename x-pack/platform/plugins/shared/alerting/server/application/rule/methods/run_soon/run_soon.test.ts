/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConstructorOptions } from '../../../../rules_client';
import { RulesClient } from '../../../../rules_client';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import type { AlertingAuthorization } from '../../../../authorization/alerting_authorization';
import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';
import { TaskAlreadyRunningError } from '@kbn/task-manager-plugin/server/lib/errors';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const logger = loggingSystemMock.create().get();

const kibanaVersion = 'v7.10.0';
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
  logger,
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
};

setGlobalDate();

describe('runSoon()', () => {
  let rulesClient: RulesClient;

  const existingRule = {
    id: '1',
    type: RULE_SAVED_OBJECT_TYPE,
    attributes: {
      name: 'name',
      consumer: 'myApp',
      schedule: { interval: '10s' },
      alertTypeId: 'myType',
      enabled: true,
      apiKey: 'MTIzOmFiYw==',
      apiKeyOwner: 'elastic',
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
      scheduledTaskId: '1',
    },
    version: '123',
    references: [],
  };

  beforeEach(() => {
    getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
    (auditLogger.log as jest.Mock).mockClear();
    rulesClient = new RulesClient(rulesClientParams);
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingRule);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingRule);
    rulesClientParams.createAPIKey.mockResolvedValue({
      apiKeysEnabled: false,
    });
    taskManager.schedule.mockResolvedValue({
      id: '1',
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      runAt: new Date(),
      state: {},
      params: {},
      taskType: '',
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });
  });

  describe('authorization', () => {
    test('ensures user is authorised to run this type of rule ad hoc under the consumer', async () => {
      await rulesClient.runSoon({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'runSoon',
        ruleTypeId: 'myType',
      });
      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'execute' });
    });

    test('throws when user is not authorised to run this type of rule ad hoc', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to run a "myType" rule for "myApp"`)
      );

      await expect(rulesClient.runSoon({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to run a "myType" rule for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'runSoon',
        ruleTypeId: 'myType',
      });
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when running a rule ad hoc', async () => {
      await rulesClient.runSoon({ id: '1' });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_run_soon',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'name' } },
        })
      );
    });

    test('logs audit event when not authorised to run a rule ad hoc', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(rulesClient.runSoon({ id: '1' })).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_run_soon',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: '1',
              type: RULE_SAVED_OBJECT_TYPE,
              name: 'name',
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

  test('runs a rule ad hoc', async () => {
    await rulesClient.runSoon({ id: '1' });
    expect(logger.info).not.toHaveBeenCalled();
    expect(taskManager.runSoon).toHaveBeenCalledWith('1', undefined);
  });

  test('runs a rule ad hoc with a force parameter', async () => {
    await rulesClient.runSoon({ id: '1', force: true });
    expect(logger.info).not.toHaveBeenCalled();
    expect(taskManager.runSoon).toHaveBeenCalledWith('1', true);
  });

  test('does not run a rule if that rule is disabled', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValue({
      ...existingRule,
      attributes: {
        ...existingRule.attributes,
        enabled: false,
      },
    });
    const message = await rulesClient.runSoon({ id: '1' });
    expect(message).toBe('Error running rule: rule is disabled');
    expect(logger.info).not.toHaveBeenCalled();
    expect(taskManager.runSoon).not.toHaveBeenCalled();
  });

  test('returns custom message if rule is already running', async () => {
    taskManager.runSoon.mockRejectedValueOnce(new TaskAlreadyRunningError('1'));
    const message = await rulesClient.runSoon({ id: '1' });
    expect(message).toBe('Rule is already running');
    expect(logger.info).not.toHaveBeenCalled();
    expect(taskManager.runSoon).toHaveBeenCalled();
  });

  test('returns custom message if rule is already running and force=true', async () => {
    taskManager.runSoon.mockRejectedValueOnce(new TaskAlreadyRunningError('1'));
    const message = await rulesClient.runSoon({ id: '1', force: true });
    expect(message).toBe('Rule is already running and cannot be forced');
    expect(logger.info).not.toHaveBeenCalled();
    expect(taskManager.runSoon).toHaveBeenCalled();
  });

  test('logs message if taskManager.runSoon returns forced: true indicator', async () => {
    taskManager.runSoon.mockResolvedValueOnce({ id: '1', forced: true });
    const message = await rulesClient.runSoon({ id: '1' });
    expect(message).toBeUndefined();
    expect(logger.info).toHaveBeenCalledWith(
      `Rule 1 was forced to run soon despite being in "running" status.`
    );
    expect(taskManager.runSoon).toHaveBeenCalled();
  });

  test('gracefully handles errors calling runSoon', async () => {
    taskManager.runSoon.mockRejectedValueOnce(new Error('fail!'));
    const message = await rulesClient.runSoon({ id: '1' });
    expect(message).toBe('Error running rule: fail!');
    expect(logger.info).not.toHaveBeenCalled();
    expect(taskManager.runSoon).toHaveBeenCalled();
  });
});
