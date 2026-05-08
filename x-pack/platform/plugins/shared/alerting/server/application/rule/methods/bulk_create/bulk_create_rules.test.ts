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

const BULK_CREATE_AS_DISABLED_PREFIX = 'Rule created in a disabled state: ';

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

interface BulkResponseInput {
  id: string;
  enabled?: boolean;
  error?: { message: string; statusCode: number };
}

const buildBulkResponse = (rules: BulkResponseInput[]) => ({
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
            enabled: r.enabled ?? false,
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
            ...(r.enabled
              ? { scheduledTaskId: r.id, lastEnabledAt: '2019-02-12T21:01:22.479Z' }
              : {}),
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
  });

  describe('foreground (synchronous result)', () => {
    test('empty input returns immediately with a resolved backgroundWork promise', async () => {
      const result = await rulesClient.bulkCreateRules({ rules: [] });

      expect(result.rules).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.backgroundWork).toBeInstanceOf(Promise);
      await expect(result.backgroundWork).resolves.toEqual([]);

      expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
      expect(taskManager.bulkSchedule).not.toHaveBeenCalled();
      expect(rulesClientParams.createAPIKey).not.toHaveBeenCalled();
    });

    test('all-disabled happy path: SO bulkCreate, no task scheduling, no API keys', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([{ id: 'mock-id-1' }, { id: 'mock-id-2' }])
      );

      const result = await rulesClient.bulkCreateRules({
        rules: [{ data: baseRule({ name: 'a' }) }, { data: baseRule({ name: 'b' }) }],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(rulesClientParams.createAPIKey).not.toHaveBeenCalled();
      expect(result.errors).toEqual([]);
      expect(result.total).toBe(2);
      expect(result.rules).toHaveLength(2);
      expect(result.backgroundWork).toBeInstanceOf(Promise);

      await result.backgroundWork;

      expect(taskManager.bulkSchedule).not.toHaveBeenCalled();
      expect(unsecuredSavedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
    });

    test('returned rules reflect input intent for enabled rows even before background runs', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([{ id: 'mock-id-1', enabled: true }])
      );
      // Stall background work so we observe the foreground state alone.
      let releaseSchedule!: () => void;
      const scheduleGate = new Promise<void>((res) => {
        releaseSchedule = res;
      });
      taskManager.bulkSchedule.mockImplementationOnce(async (tasks) => {
        await scheduleGate;
        return tasks as never;
      });

      const result = await rulesClient.bulkCreateRules({
        rules: [{ data: baseRule({ name: 'a', enabled: true }) }],
      });

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].enabled).toBe(true);
      expect(result.rules[0].scheduledTaskId).toBe('mock-id-1');

      releaseSchedule();
      await result.backgroundWork;
    });

    test('Phase 1 per-rule prepare error is isolated', async () => {
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

      await result.backgroundWork;
    });

    test('Phase 1 API key creation failure: enabled rule degrades to disabled in foreground', async () => {
      rulesClientParams.createAPIKey.mockRejectedValueOnce(new Error('keys disabled'));
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([{ id: 'mock-id-1' }, { id: 'mock-id-2', enabled: true }])
      );

      const result = await rulesClient.bulkCreateRules({
        rules: [
          { data: baseRule({ name: 'enabled-keyfail', enabled: true }) },
          { data: baseRule({ name: 'enabled-ok', enabled: true }) },
        ],
      });

      // Both rules persisted. The first is sent to bulkCreate as already-disabled
      // (mint failed). The second is sent enabled.
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(2);
      const persistedAttrsByName = new Map(
        (
          unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0] as Array<{
            attributes: { name: string; enabled: boolean; apiKey: string | null };
          }>
        ).map((o) => [o.attributes.name, o.attributes])
      );
      expect(persistedAttrsByName.get('enabled-keyfail')?.enabled).toBe(false);
      expect(persistedAttrsByName.get('enabled-keyfail')?.apiKey).toBeNull();
      expect(persistedAttrsByName.get('enabled-ok')?.enabled).toBe(true);

      // Foreground demotion (key-mint failure) IS surfaced in errors[].
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual(
        expect.objectContaining({
          disabledReason: 'api_key_creation_failed',
          rule: expect.objectContaining({ name: 'enabled-keyfail' }),
        })
      );
      expect(result.errors[0].message.startsWith(BULK_CREATE_AS_DISABLED_PREFIX)).toBe(true);
      expect(result.errors[0].message).toContain('keys disabled');

      await result.backgroundWork;

      // Only the surviving enabled rule was scheduled.
      expect(taskManager.bulkSchedule).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkSchedule.mock.calls[0][0]).toHaveLength(1);
    });

    test('per-row SO error invalidates that rule’s API key, no demotion of others', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([
          { id: 'mock-id-1', error: { message: 'conflict', statusCode: 409 } },
          { id: 'mock-id-2', enabled: true },
        ])
      );

      const result = await rulesClient.bulkCreateRules({
        rules: [
          { data: baseRule({ name: 'enabled-conflict', enabled: true }) },
          { data: baseRule({ name: 'enabled-ok', enabled: true }) },
        ],
      });

      expect(result.rules).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].status).toBe(409);
      expect(result.errors[0].disabledReason).toBeUndefined();

      await result.backgroundWork;

      // The 409’d row’s key is invalidated; the surviving enabled row’s key
      // is NOT (its rule is live).
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
      // Only the surviving row was scheduled.
      expect(taskManager.bulkSchedule).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkSchedule.mock.calls[0][0]).toHaveLength(1);
      // No orphan-task cleanup needed: nothing was scheduled for the failed id.
      expect(taskManager.bulkRemove).not.toHaveBeenCalled();
    });

    test('whole-call SO bulkCreate failure invalidates all minted keys and rethrows synchronously', async () => {
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
      // Nothing was scheduled, so no orphan cleanup.
      expect(taskManager.bulkSchedule).not.toHaveBeenCalled();
      expect(taskManager.bulkRemove).not.toHaveBeenCalled();
    });

    test('emits CREATE for all surviving rules and ENABLE only for enabled rows, in foreground', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([{ id: 'mock-id-1', enabled: true }, { id: 'mock-id-2' }])
      );

      const result = await rulesClient.bulkCreateRules({
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
      // No DISABLE in the foreground.
      expect(actions.filter((a) => a === RuleAuditAction.DISABLE)).toHaveLength(0);

      await result.backgroundWork;
    });
  });

  describe('background (after awaiting backgroundWork)', () => {
    test('schedules tasks with enabled: true for all enabled persisted rules', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([
          { id: 'mock-id-1', enabled: true },
          { id: 'mock-id-2', enabled: true },
        ])
      );

      const result = await rulesClient.bulkCreateRules({
        rules: [
          { data: baseRule({ name: 'a', enabled: true }) },
          { data: baseRule({ name: 'b', enabled: true }) },
        ],
      });

      await expect(result.backgroundWork).resolves.toEqual([]);

      expect(taskManager.bulkSchedule).toHaveBeenCalledTimes(1);
      const tasks = taskManager.bulkSchedule.mock.calls[0][0] as Array<{
        id: string;
        enabled: boolean;
      }>;
      expect(tasks.map((t) => t.id)).toEqual(['mock-id-1', 'mock-id-2']);
      expect(tasks.every((t) => t.enabled === true)).toBe(true);
      expect(taskManager.bulkEnable).not.toHaveBeenCalled();
      // No demotion = no SO update.
      expect(unsecuredSavedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
    });

    test('schedule-limit exceeded: bulkUpdate demotes all enabled persisted rules; result.errors[] unchanged', async () => {
      (validateScheduleLimit as jest.Mock).mockResolvedValue({
        interval: 100,
        intervalAvailable: 50,
      });
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([{ id: 'mock-id-1', enabled: true }, { id: 'mock-id-2' }])
      );

      const result = await rulesClient.bulkCreateRules({
        rules: [
          { data: baseRule({ name: 'enabled', enabled: true }) },
          { data: baseRule({ name: 'disabled' }) },
        ],
      });

      // Caller-visible result reflects input intent even though background
      // will demote the enabled rule.
      expect(result.rules).toHaveLength(2);
      expect(result.errors).toHaveLength(0);

      // backgroundWork surfaces the demotion error.
      await expect(result.backgroundWork).resolves.toEqual([
        expect.objectContaining({
          rule: expect.objectContaining({ id: 'mock-id-1' }),
          disabledReason: 'schedule_limit_exceeded',
        }),
      ]);

      // Tasks were never scheduled (limit-tripped before bulkSchedule).
      expect(taskManager.bulkSchedule).not.toHaveBeenCalled();
      // Background bulkUpdate demotes the enabled rule.
      expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      const updateCall = unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0][0] as Array<{
        id: string;
        attributes: Record<string, unknown>;
      }>;
      expect(updateCall).toHaveLength(1);
      expect(updateCall[0].id).toBe('mock-id-1');
      expect(updateCall[0].attributes).toMatchObject({
        enabled: false,
        scheduledTaskId: null,
        lastEnabledAt: null,
      });
      // The minted key is queued for invalidation in Phase D.
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
      // DISABLE audit event for the demoted rule.
      const disableActions = (auditLogger.log as jest.Mock).mock.calls
        .map(([event]) => event?.event?.action)
        .filter((a) => a === RuleAuditAction.DISABLE);
      expect(disableActions).toHaveLength(1);
    });

    test('whole-call task scheduling failure: bulkUpdate demotes the enabled subset; bulkRemove not called', async () => {
      taskManager.bulkSchedule.mockRejectedValueOnce(new Error('cluster unavailable'));
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([{ id: 'mock-id-1', enabled: true }, { id: 'mock-id-2' }])
      );

      const result = await rulesClient.bulkCreateRules({
        rules: [
          { data: baseRule({ name: 'enabled', enabled: true }) },
          { data: baseRule({ name: 'disabled' }) },
        ],
      });

      expect(result.errors).toHaveLength(0);

      await expect(result.backgroundWork).resolves.toEqual([
        expect.objectContaining({
          rule: expect.objectContaining({ id: 'mock-id-1' }),
          disabledReason: 'task_schedule_failed',
        }),
      ]);

      expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      const updateCall = unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0][0] as Array<{
        id: string;
      }>;
      expect(updateCall.map((u) => u.id)).toEqual(['mock-id-1']);
      // No tasks were created on a whole-call throw.
      expect(taskManager.bulkRemove).not.toHaveBeenCalled();
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    });

    test('silent per-task drop: bulkUpdate demotes only the dropped ids', async () => {
      // bulkSchedule returns only the first task — the second was silently dropped.
      taskManager.bulkSchedule.mockImplementationOnce(async (tasks) => [tasks[0]] as never);
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([
          { id: 'mock-id-1', enabled: true },
          { id: 'mock-id-2', enabled: true },
        ])
      );

      const result = await rulesClient.bulkCreateRules({
        rules: [
          { data: baseRule({ name: 'kept', enabled: true }) },
          { data: baseRule({ name: 'dropped', enabled: true }) },
        ],
      });

      expect(result.errors).toHaveLength(0);

      await expect(result.backgroundWork).resolves.toEqual([
        expect.objectContaining({
          rule: expect.objectContaining({ id: 'mock-id-2' }),
          disabledReason: 'task_schedule_entry_failed',
        }),
      ]);

      expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      const updateCall = unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0][0] as Array<{
        id: string;
      }>;
      expect(updateCall.map((u) => u.id)).toEqual(['mock-id-2']);
      expect(taskManager.bulkRemove).not.toHaveBeenCalled();
    });

    test('background bulkUpdate throwing does not reject backgroundWork (caught + logged)', async () => {
      taskManager.bulkSchedule.mockRejectedValueOnce(new Error('cluster unavailable'));
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([{ id: 'mock-id-1', enabled: true }])
      );
      unsecuredSavedObjectsClient.bulkUpdate.mockRejectedValueOnce(new Error('SO write down'));

      const result = await rulesClient.bulkCreateRules({
        rules: [{ data: baseRule({ name: 'a', enabled: true }) }],
      });

      // Awaiting must not throw; demotion errors were collected before the
      // bulkUpdate failed, so they still surface to the caller.
      await expect(result.backgroundWork).resolves.toEqual([
        expect.objectContaining({
          rule: expect.objectContaining({ id: 'mock-id-1' }),
          disabledReason: 'task_schedule_failed',
        }),
      ]);

      expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      // Logger.error is called for the bulkUpdate failure.
      const errorMock = rulesClientParams.logger.error as jest.Mock;
      const messages = errorMock.mock.calls.map(([msg]) => String(msg));
      expect(messages.some((m) => m.includes('bulkUpdate to demote'))).toBe(true);
    });

    test('flushKeysToInvalidate is called even when no demotions occur (queued by per-row SO failures)', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([{ id: 'mock-id-1', error: { message: 'conflict', statusCode: 409 } }])
      );

      const result = await rulesClient.bulkCreateRules({
        rules: [{ data: baseRule({ name: 'a', enabled: true }) }],
      });

      await result.backgroundWork;

      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
      // No tasks were scheduled (no enabled persisted rules), no bulkUpdate.
      expect(taskManager.bulkSchedule).not.toHaveBeenCalled();
      expect(unsecuredSavedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
    });
  });
});
