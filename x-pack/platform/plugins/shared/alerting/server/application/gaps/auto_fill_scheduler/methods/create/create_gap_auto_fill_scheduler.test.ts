/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import type { AlertingAuthorization } from '../../../../../authorization';
import { alertingAuthorizationMock } from '../../../../../authorization/alerting_authorization.mock';
import { ruleTypeRegistryMock } from '../../../../../rule_type_registry.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { ConstructorOptions } from '../../../../../rules_client';
import { RulesClient } from '../../../../../rules_client';
import { ConnectorAdapterRegistry } from '../../../../../connector_adapters/connector_adapter_registry';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../../saved_objects';
import type { GapAutoFillSchedulerSO } from '../../../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import { transformSavedObjectToGapAutoFillSchedulerResult } from '../../transforms';
import type { SavedObject, KibanaRequest } from '@kbn/core/server';
import type { TaskInstanceWithId } from '@kbn/task-manager-plugin/server/task';
import type { CreateGapAutoFillSchedulerParams } from './types';

const kibanaVersion = 'v8.0.0';
const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  getUserName: jest.fn().mockResolvedValue('elastic'),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: null as unknown as never,
  isSystemAction: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
};

function getParams(
  overwrites: Partial<CreateGapAutoFillSchedulerParams> = {}
): CreateGapAutoFillSchedulerParams {
  return {
    name: 'auto-fill',
    enabled: true,
    maxBackfills: 100,
    numRetries: 3,

    gapFillRange: 'now-1d',
    schedule: { interval: '1h' },
    ruleTypes: [
      { type: 'test-rule-type1', consumer: 'test-consumer' },
      { type: 'test-rule-type2', consumer: 'test-consumer' },
    ],
    scope: ['scope-1'],
    request: {} as unknown as KibanaRequest,
    ...overwrites,
  };
}

const getSavedObject = (id: string = 'gap-1'): SavedObject<GapAutoFillSchedulerSO> => ({
  id,
  type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
  attributes: {
    id,
    name: 'auto-fill',
    enabled: true,
    schedule: { interval: '1h' },
    gapFillRange: 'now-1d',
    maxBackfills: 100,
    numRetries: 3,
    scope: ['scope-1'],
    ruleTypes: [
      { type: 'test-rule-type1', consumer: 'test-consumer' },
      { type: 'test-rule-type2', consumer: 'test-consumer' },
    ],
    ruleTypeConsumerPairs: ['test-rule-type1:test-consumer', 'test-rule-type2:test-consumer'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'elastic',
    updatedBy: 'elastic',
  },
  references: [],
});

describe('createGapFillAutoScheduler()', () => {
  let rulesClient: RulesClient;

  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient = new RulesClient(rulesClientParams);

    unsecuredSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 1,
      page: 1,
    });

    unsecuredSavedObjectsClient.create.mockResolvedValue(getSavedObject());

    const scheduledTask: TaskInstanceWithId = {
      id: 'task-1',
      taskType: 'gap-fill-auto-scheduler-task',
      params: {},
      state: {},
    };
    taskManager.ensureScheduled.mockResolvedValue(scheduledTask);

    const soFetched: SavedObject<GapAutoFillSchedulerSO> = {
      id: 'gap-1',
      type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      attributes: {
        id: 'gap-1',
        name: 'auto-fill',
        enabled: true,
        schedule: { interval: '1h' },
        gapFillRange: 'now-1d',
        maxBackfills: 100,
        numRetries: 3,
        scope: ['scope-1'],
        ruleTypes: [
          { type: 'test-rule-type1', consumer: 'test-consumer' },
          { type: 'test-rule-type2', consumer: 'test-consumer' },
        ],
        ruleTypeConsumerPairs: ['test-rule-type1:test-consumer', 'test-rule-type2:test-consumer'],
        createdAt: new Date().toISOString(),
        createdBy: 'elastic',
        updatedAt: new Date().toISOString(),
        updatedBy: 'elastic',
      },
      references: [],
    };
    unsecuredSavedObjectsClient.get.mockResolvedValue(soFetched);
  });

  test('succeeds creating and scheduling task', async () => {
    const params = getParams();
    const result = await rulesClient.createGapAutoFillScheduler(params);

    expect(ruleTypeRegistry.get).toHaveBeenCalledWith('test-rule-type1');
    expect(ruleTypeRegistry.get).toHaveBeenCalledWith('test-rule-type2');
    expect(authorization.ensureAuthorized).toHaveBeenCalledTimes(2);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      expect.objectContaining({ name: 'auto-fill', enabled: true }),
      expect.any(Object)
    );

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'gap-1',
        taskType: 'gap-auto-fill-scheduler-task',
        schedule: { interval: '1h' },
        scope: ['scope-1'],
        params: { configId: 'gap-1', spaceId: 'default' },
        state: {},
      }),
      expect.objectContaining({ request: params.request })
    );

    expect(auditLogger.log).toHaveBeenCalledTimes(1);

    expect(result).toEqual(
      transformSavedObjectToGapAutoFillSchedulerResult({
        savedObject: await unsecuredSavedObjectsClient.create.mock.results[0].value,
      })
    );
  });

  test('succeeds creating scheduler when disabled without scheduling task', async () => {
    const params = getParams({ enabled: false });

    const soDisabled: SavedObject<GapAutoFillSchedulerSO> = {
      id: 'gap-1',
      type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      attributes: {
        id: 'gap-1',
        name: 'auto-fill',
        enabled: false,
        schedule: { interval: '1h' },
        gapFillRange: 'now-1d',
        maxBackfills: 100,
        numRetries: 3,
        scope: ['scope-1'],
        ruleTypes: [
          { type: 'test-rule-type1', consumer: 'test-consumer' },
          { type: 'test-rule-type2', consumer: 'test-consumer' },
        ],
        ruleTypeConsumerPairs: ['test-rule-type1:test-consumer', 'test-rule-type2:test-consumer'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'elastic',
        updatedBy: 'elastic',
      },
      references: [],
    };

    unsecuredSavedObjectsClient.create.mockResolvedValueOnce(soDisabled);

    const result = await rulesClient.createGapAutoFillScheduler(params);

    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      expect.objectContaining({ name: 'auto-fill', enabled: false }),
      expect.any(Object)
    );

    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();

    expect(auditLogger.log).toHaveBeenCalledTimes(1);

    expect(result).toEqual(
      transformSavedObjectToGapAutoFillSchedulerResult({
        savedObject: soDisabled,
      })
    );
  });

  test('succeeds creating and scheduling task with custom id', async () => {
    const params = getParams({ id: 'custom-gap-id' });
    const soWithCustomId: SavedObject<GapAutoFillSchedulerSO> = getSavedObject('custom-gap-id');
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce(soWithCustomId);

    const result = await rulesClient.createGapAutoFillScheduler(params);

    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      expect.objectContaining({ name: 'auto-fill' }),
      expect.objectContaining({ id: 'custom-gap-id' })
    );
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'custom-gap-id' }),
      expect.any(Object)
    );
    expect(result).toEqual(
      transformSavedObjectToGapAutoFillSchedulerResult({
        savedObject: soWithCustomId,
      })
    );
  });

  test('throws an error if a rule type is not registered', async () => {
    ruleTypeRegistry.get.mockImplementationOnce(() => {
      throw new Error('Invalid type');
    });

    await expect(rulesClient.createGapAutoFillScheduler(getParams())).rejects.toThrow(
      'Invalid type'
    );

    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
  });

  test('deletes saved object and throws if scheduling task fails', async () => {
    taskManager.ensureScheduled.mockRejectedValueOnce(new Error('schedule failed'));

    await expect(rulesClient.createGapAutoFillScheduler(getParams())).rejects.toThrow(
      'schedule failed'
    );

    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledWith(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      'gap-1'
    );
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  test('validates params and throws on invalid', async () => {
    const invalid = {
      ...getParams(),
      schedule: { interval: 1 as unknown as string },
      // Ensure request contents are not leaked into logs/errors
      request: { secret: 'SHOULD_NOT_APPEAR' } as unknown as KibanaRequest,
    } as unknown as CreateGapAutoFillSchedulerParams;

    expect.assertions(4);
    try {
      await rulesClient.createGapAutoFillScheduler(invalid);
    } catch (err) {
      const message = String((err as Error).message ?? err);
      expect(message).toMatch(/Error validating gap auto fill scheduler parameters/);
      expect(message).not.toContain('SHOULD_NOT_APPEAR');
      expect(message).not.toContain('"request"');
      expect(auditLogger.log).not.toHaveBeenCalled();
    }
  });

  test('logs and rethrows when authorization fails', async () => {
    (authorization.ensureAuthorized as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no access');
    });

    await expect(rulesClient.createGapAutoFillScheduler(getParams())).rejects.toThrow('no access');

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: 'gap_auto_fill_scheduler_create' }),
      })
    );
  });
});
