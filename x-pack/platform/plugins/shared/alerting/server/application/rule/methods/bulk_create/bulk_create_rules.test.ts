/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreFeatureFlagsMock,
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import type { ActionsAuthorization, ActionsClient } from '@kbn/actions-plugin/server';
import { createMockConnector } from '@kbn/actions-plugin/server/application/connector/mocks';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import type { AlertingAuthorization } from '../../../../authorization/alerting_authorization';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import type { ConstructorOptions } from '../../../../rules_client/rules_client';
import { RulesClient } from '../../../../rules_client/rules_client';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { validateScheduleLimit } from '../get_schedule_frequency';
import { RuleAuditAction } from '../../../../rules_client/common/audit_events';

jest.mock('../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

jest.mock('../get_schedule_frequency', () => ({
  validateScheduleLimit: jest.fn(),
}));

jest.mock('@kbn/core-saved-objects-utils-server', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-utils-server');
  return {
    ...actual,
    SavedObjectsUtils: {
      generateId: jest.fn(),
    },
  };
});

import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';

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
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion: 'v8.0.0',
  auditLogger,
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  isSystemAction: jest.fn(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  featureFlags: coreFeatureFlagsMock.createStart(),
  isServerless: false,
};

setGlobalDate();

const baseRule = (overrides: Record<string, unknown> = {}) => ({
  enabled: false,
  name: 'r',
  tags: [],
  alertTypeId: '123',
  consumer: 'bar',
  schedule: { interval: '1m' },
  throttle: null,
  notifyWhen: null,
  params: { foo: true },
  actions: [],
  ...overrides,
});

const buildBulkResponse = (
  rules: Array<{ id: string; error?: { message: string; statusCode: number } }>
) => ({
  saved_objects: rules.map((r) => ({
    id: r.id,
    type: RULE_SAVED_OBJECT_TYPE,
    references: [],
    ...(r.error
      ? { error: { ...r.error, error: 'Conflict' } }
      : {
          attributes: {
            alertTypeId: '123',
            name: `name-${r.id}`,
            enabled: false,
            consumer: 'bar',
            schedule: { interval: '1m' },
            params: { foo: true },
            actions: [],
            createdBy: 'elastic',
            updatedBy: 'elastic',
            createdAt: '2019-02-12T21:01:22.479Z',
            updatedAt: '2019-02-12T21:01:22.479Z',
            snoozeSchedule: [],
            muteAll: false,
            mutedInstanceIds: [],
            executionStatus: { status: 'pending', lastExecutionDate: '2019-02-12T21:01:22.479Z' },
            revision: 0,
            running: false,
            apiKey: null,
            apiKeyOwner: null,
            apiKeyCreatedByUser: null,
          },
        }),
  })) as never,
});

describe('bulkCreateRules', () => {
  let rulesClient: RulesClient;
  let actionsClient: jest.Mocked<ActionsClient>;

  beforeEach(async () => {
    getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
    (auditLogger.log as jest.Mock).mockClear();
    (bulkMarkApiKeysForInvalidation as jest.Mock).mockReset();
    (validateScheduleLimit as jest.Mock).mockReset();
    let counter = 0;
    (SavedObjectsUtils.generateId as jest.Mock).mockImplementation(() => `mock-id-${++counter}`);
    rulesClient = new RulesClient(rulesClientParams);
    actionsClient = (await rulesClientParams.getActionsClient()) as jest.Mocked<ActionsClient>;
    actionsClient.getBulk.mockResolvedValue([
      createMockConnector({ id: '1', actionTypeId: 'test', name: 'a' }),
    ]);
    actionsClient.listTypes.mockResolvedValue([]);
    actionsClient.isSystemAction.mockReturnValue(false);
    rulesClientParams.getActionsClient.mockResolvedValue(actionsClient);
    rulesClientParams.createAPIKey.mockResolvedValue({
      apiKeysEnabled: true,
      result: { id: 'key-id', name: 'key', api_key: 'key-value' } as never,
    });
    rulesClientParams.isAuthenticationTypeAPIKey.mockReturnValue(false);
    taskManager.bulkSchedule.mockImplementation(async (tasks) => tasks as never);
    taskManager.bulkEnable.mockResolvedValue({ tasks: [], errors: [] } as never);
  });

  test('returns empty result for empty input without touching SO/TM/key clients', async () => {
    const result = await rulesClient.bulkCreateRules({ rules: [] });
    expect(result).toEqual({ rules: [], errors: [], total: 0, taskIdsFailedToBeEnabled: [] });
    expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    expect(taskManager.bulkSchedule).not.toHaveBeenCalled();
    expect(rulesClientParams.createAPIKey).not.toHaveBeenCalled();
  });

  test('all-disabled happy path: single bulkCreate, no TM, no API keys', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
      buildBulkResponse([{ id: 'mock-id-1' }, { id: 'mock-id-2' }])
    );

    const result = await rulesClient.bulkCreateRules({
      rules: [{ data: baseRule({ name: 'a' }) }, { data: baseRule({ name: 'b' }) }],
    });

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkSchedule).not.toHaveBeenCalled();
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
    expect(rulesClientParams.createAPIKey).not.toHaveBeenCalled();
    expect(result.errors).toEqual([]);
    expect(result.total).toBe(2);
    expect(result.rules).toHaveLength(2);
    expect(result.taskIdsFailedToBeEnabled).toEqual([]);
  });

  test('all-enabled happy path: API keys, bulkSchedule, bulkCreate, bulkEnable', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
      buildBulkResponse([{ id: 'mock-id-1' }, { id: 'mock-id-2' }])
    );

    const result = await rulesClient.bulkCreateRules({
      rules: [
        { data: baseRule({ name: 'a', enabled: true }) },
        { data: baseRule({ name: 'b', enabled: true }) },
      ],
    });

    expect(rulesClientParams.createAPIKey).toHaveBeenCalledTimes(2);
    expect(taskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    const scheduledIds = (taskManager.bulkSchedule.mock.calls[0][0] as Array<{ id: string }>).map(
      (t) => t.id
    );
    expect(scheduledIds).toEqual(['mock-id-1', 'mock-id-2']);
    // tasks are scheduled disabled; bulkEnable flips them on
    expect(
      (taskManager.bulkSchedule.mock.calls[0][0] as Array<{ enabled: boolean }>).every(
        (t) => t.enabled === false
      )
    ).toBe(true);
    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['mock-id-1', 'mock-id-2']);
    expect(result.errors).toEqual([]);
    expect(result.total).toBe(2);
    expect(result.rules).toHaveLength(2);
    expect(result.taskIdsFailedToBeEnabled).toEqual([]);
  });

  test('mixed enabled+disabled happy path', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
      buildBulkResponse([{ id: 'mock-id-1' }, { id: 'mock-id-2' }])
    );

    const result = await rulesClient.bulkCreateRules({
      rules: [{ data: baseRule({ name: 'a', enabled: true }) }, { data: baseRule({ name: 'b' }) }],
    });

    expect(rulesClientParams.createAPIKey).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkSchedule.mock.calls[0][0]).toHaveLength(1);
    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['mock-id-1']);
    expect(result.errors).toEqual([]);
    expect(result.total).toBe(2);
  });

  test('Phase 1 per-rule throw is isolated', async () => {
    let calls = 0;
    ruleTypeRegistry.get.mockImplementation((typeId: string) => {
      calls += 1;
      if (calls === 1) throw new Error('rule type not found');
      return {
        id: typeId,
        name: 'Test',
        actionGroups: [{ id: 'default', name: 'Default' }],
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        async executor() {
          return { state: {} };
        },
        category: 'test',
        producer: 'alerts',
        solution: 'stack',
        validate: { params: { validate: (p: unknown) => p } },
        validLegacyConsumers: [],
      } as never;
    });
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
      buildBulkResponse([{ id: 'mock-id-2' }])
    );

    const result = await rulesClient.bulkCreateRules({
      rules: [{ data: baseRule({ name: 'fails' }) }, { data: baseRule({ name: 'ok' }) }],
    });

    expect(result.total).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule.name).toBe('fails');
    expect(result.rules).toHaveLength(1);
    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
  });

  test('Phase 2 schedule-limit trip: enabled keys invalidated, disabled subset still created', async () => {
    (validateScheduleLimit as jest.Mock).mockResolvedValue({
      interval: 100,
      intervalAvailable: 50,
    });
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
      buildBulkResponse([{ id: 'mock-id-2' }])
    );

    const result = await rulesClient.bulkCreateRules({
      rules: [
        { data: baseRule({ name: 'enabled', enabled: true }) },
        { data: baseRule({ name: 'disabled' }) },
      ],
    });

    // The enabled rule contributed an API key → must be invalidated
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalled();
    // The disabled rule must still be persisted
    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
    expect(taskManager.bulkSchedule).not.toHaveBeenCalled();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule.name).toBe('enabled');
    expect(result.rules).toHaveLength(1);
  });

  test('Phase 3 whole TM throw: enabled subset failed, disabled subset still created', async () => {
    taskManager.bulkSchedule.mockRejectedValueOnce(new Error('cluster unavailable'));
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
      buildBulkResponse([{ id: 'mock-id-2' }])
    );

    const result = await rulesClient.bulkCreateRules({
      rules: [
        { data: baseRule({ name: 'enabled', enabled: true }) },
        { data: baseRule({ name: 'disabled' }) },
      ],
    });

    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule.name).toBe('enabled');
    expect(result.rules).toHaveLength(1);
  });

  test('Phase 3 silent per-task drop: per-rule error pushed and rule dropped before SO write', async () => {
    // Simulate task_store dropping one of the two scheduled tasks.
    taskManager.bulkSchedule.mockImplementationOnce(async (tasks) => {
      return [tasks[0]] as never;
    });
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
      buildBulkResponse([{ id: 'mock-id-1' }])
    );

    const result = await rulesClient.bulkCreateRules({
      rules: [
        { data: baseRule({ name: 'kept', enabled: true }) },
        { data: baseRule({ name: 'dropped', enabled: true }) },
      ],
    });

    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule.name).toBe('dropped');
    expect(result.rules).toHaveLength(1);
  });

  test('Phase 4 per-row error on Phase-3-scheduled id: per-rule key invalidated, removeIfExists called', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
      buildBulkResponse([{ id: 'mock-id-1', error: { message: 'conflict', statusCode: 409 } }])
    );

    const result = await rulesClient.bulkCreateRules({
      rules: [{ data: baseRule({ name: 'enabled', enabled: true }) }],
    });

    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    // the only key in the call → only the failed rule's key
    expect(taskManager.removeIfExists).toHaveBeenCalledWith('mock-id-1');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].status).toBe(409);
    expect(result.rules).toHaveLength(0);
  });

  test('Phase 4 per-row error on caller-supplied id NOT in scheduledTaskIdsThisCall: NO removeIfExists', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
      buildBulkResponse([{ id: 'caller-id', error: { message: 'conflict', statusCode: 409 } }])
    );

    await rulesClient.bulkCreateRules({
      rules: [{ data: baseRule({ name: 'disabled-collision' }), options: { id: 'caller-id' } }],
    });

    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
  });

  test('Phase 4 whole-call throw: invalidates every newly-minted key and best-effort bulkRemove of scheduled ids, then rethrows', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockRejectedValueOnce(new Error('SO down'));

    await expect(
      rulesClient.bulkCreateRules({
        rules: [
          { data: baseRule({ name: 'a', enabled: true }) },
          { data: baseRule({ name: 'b', enabled: true }) },
        ],
      })
    ).rejects.toThrow('SO down');

    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkRemove).toHaveBeenCalledWith(['mock-id-1', 'mock-id-2']);
  });

  test('Phase 5 per-task enable error: surfaced in taskIdsFailedToBeEnabled, no SO rollback', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
      buildBulkResponse([{ id: 'mock-id-1' }])
    );
    taskManager.bulkEnable.mockResolvedValueOnce({
      tasks: [],
      errors: [{ id: 'mock-id-1', error: { type: 'foo', message: 'no' } }],
    } as never);

    const result = await rulesClient.bulkCreateRules({
      rules: [{ data: baseRule({ name: 'a', enabled: true }) }],
    });

    expect(result.taskIdsFailedToBeEnabled).toEqual(['mock-id-1']);
    expect(result.rules).toHaveLength(1);
  });

  test('emits per-rule CREATE audit event for surviving rules and ENABLE for the enabled subset', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
      buildBulkResponse([{ id: 'mock-id-1' }, { id: 'mock-id-2' }])
    );

    await rulesClient.bulkCreateRules({
      rules: [
        { data: baseRule({ name: 'enabled', enabled: true }) },
        { data: baseRule({ name: 'disabled' }) },
      ],
    });

    const actions = (auditLogger.log as jest.Mock).mock.calls
      .map(([event]) => event?.event?.action)
      .filter(Boolean);
    expect(actions.filter((a) => a === RuleAuditAction.CREATE)).toHaveLength(2);
    expect(actions.filter((a) => a === RuleAuditAction.ENABLE)).toHaveLength(1);
  });
});
