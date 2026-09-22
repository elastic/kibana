/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { createMockConnector } from '@kbn/actions-plugin/server/application/connector/mocks';
import { RuleChangeTrackingAction } from '@kbn/alerting-types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import { RulesClient } from '../../../../rules_client/rules_client';
import { getRulesClientMockParams } from '../../../../test_utils';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { bulkMigrateLegacyActions } from '../../../../rules_client/lib';
import { addMissingUiamKeyTagIfNeeded } from '../../../../rules_client/common';
import { validateScheduleLimit } from '../get_schedule_frequency';
import { RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  MIN_BULK_UPDATE_BATCH_SIZE,
  MAX_BULK_UPDATE_BATCH_SIZE,
  MAX_RULES_NUMBER_FOR_BULK_OPERATION,
} from '../../../../rules_client/common/constants';
import type { RawRule } from '../../../../types';

jest.mock('../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

jest.mock('../get_schedule_frequency', () => ({
  validateScheduleLimit: jest.fn(),
}));

jest.mock('../../../../rules_client/lib/siem_legacy_actions/migrate_legacy_actions', () => ({
  bulkMigrateLegacyActions: jest.fn(),
}));

jest.mock('../../../../rules_client/common/api_key_as_alert_attributes', () => {
  const actual = jest.requireActual('../../../../rules_client/common/api_key_as_alert_attributes');
  return {
    ...actual,
    addMissingUiamKeyTagIfNeeded: jest.fn((...args: unknown[]) =>
      actual.addMissingUiamKeyTagIfNeeded(...args)
    ),
  };
});

const {
  rulesClientParams,
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  encryptedSavedObjects,
  authorization,
  auditLogger,
} = getRulesClientMockParams({ kibanaVersion: 'v8.0.0' });

setGlobalDate();

const data = (overrides: Record<string, unknown> = {}) => ({
  name: 'r',
  tags: [],
  schedule: { interval: '1m' },
  params: { foo: true },
  actions: [],
  ...overrides,
});

const so = (
  id: string,
  overrides: Record<string, unknown> = {}
): SavedObject<Partial<RawRule>> => ({
  id,
  type: RULE_SAVED_OBJECT_TYPE,
  version: '1',
  references: [],
  attributes: {
    name: `name-${id}`,
    enabled: false,
    tags: [],
    alertTypeId: '123',
    consumer: 'siem',
    schedule: { interval: '1m' },
    params: { foo: true },
    actions: [],
    muteAll: false,
    mutedInstanceIds: [],
    snoozeSchedule: [],
    executionStatus: {
      status: 'pending',
      lastExecutionDate: '2019-02-12T21:01:22.479Z',
      error: null,
      warning: null,
    },
    revision: 0,
    running: false,
    createdBy: 'elastic',
    createdAt: '2019-02-12T21:01:22.479Z',
    updatedBy: 'elastic',
    updatedAt: '2019-02-12T21:01:22.479Z',
    apiKey: null,
    apiKeyOwner: null,
    apiKeyCreatedByUser: null,
    legacyId: null,
    ...overrides,
  },
});

const item = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  data: data({ name: `name-${id}`, ...overrides }),
});

const nItems = (count: number, overrides: Record<string, unknown> = {}) =>
  Array.from({ length: count }, (_, i) => item(`id-${i}`, overrides));

const nSos = (count: number, overrides: Record<string, unknown> = {}) =>
  Array.from({ length: count }, (_, i) => so(`id-${i}`, overrides));

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
            consumer: 'siem',
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

const echoBulkCreate = () => {
  unsecuredSavedObjectsClient.bulkCreate.mockImplementation(async (objects) =>
    buildBulkResponse((objects as Array<{ id: string }>).map((o) => ({ id: o.id })))
  );
};

describe('bulkUpdateRules', () => {
  let rulesClient: RulesClient;
  let actionsClient: jest.Mocked<ActionsClient>;
  const actualAddUiam = jest.requireActual(
    '../../../../rules_client/common/api_key_as_alert_attributes'
  ).addMissingUiamKeyTagIfNeeded as typeof addMissingUiamKeyTagIfNeeded;

  const mockPit = (...pages: Array<Array<SavedObject<Partial<RawRule>>>>) => {
    let i = 0;
    encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
      .fn()
      .mockImplementation(async () => {
        const savedObjects = pages[Math.min(i, pages.length - 1)] ?? [];
        i += 1;
        return {
          close: jest.fn(),
          async *find() {
            yield { saved_objects: savedObjects };
          },
        };
      });
  };

  beforeEach(async () => {
    getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
    (auditLogger.log as jest.Mock).mockClear();
    (bulkMarkApiKeysForInvalidation as jest.Mock).mockReset();
    (validateScheduleLimit as jest.Mock).mockReset();
    (bulkMigrateLegacyActions as jest.Mock).mockReset();
    (bulkMigrateLegacyActions as jest.Mock).mockResolvedValue([]);
    (addMissingUiamKeyTagIfNeeded as jest.Mock).mockImplementation((...args: unknown[]) =>
      actualAddUiam(...(args as Parameters<typeof actualAddUiam>))
    );
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
    echoBulkCreate();
  });

  describe('happy paths', () => {
    test('returns empty result for empty input without touching PIT/SO/TM/key clients', async () => {
      const result = await rulesClient.bulkUpdateRules({ rules: [] });
      expect(result).toEqual({ successfulIds: [], errors: [], total: 0 });
      expect(
        encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser
      ).not.toHaveBeenCalled();
      expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
      expect(taskManager.bulkUpdateSchedules).not.toHaveBeenCalled();
      expect(rulesClientParams.createAPIKey).not.toHaveBeenCalled();
    });

    test('disabled: overwrite SO, no key mint, enabled stays false, migrate then write', async () => {
      const order: string[] = [];
      (bulkMigrateLegacyActions as jest.Mock).mockImplementation(async () => {
        order.push('migrate');
        return [];
      });
      unsecuredSavedObjectsClient.bulkCreate.mockImplementation(async (objects) => {
        order.push('write');
        return buildBulkResponse((objects as Array<{ id: string }>).map((o) => ({ id: o.id })));
      });
      mockPit([so('id-1'), so('id-2')]);

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1', { name: 'a' }), item('id-2', { name: 'b' })],
      });

      expect(order).toEqual(['migrate', 'write']);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'id-1',
            attributes: expect.objectContaining({ enabled: false, name: 'a' }),
          }),
        ]),
        { overwrite: true }
      );
      expect(rulesClientParams.createAPIKey).not.toHaveBeenCalled();
      expect(taskManager.bulkUpdateSchedules).not.toHaveBeenCalled();
      expect(result).toEqual({ successfulIds: ['id-1', 'id-2'], errors: [], total: 2 });
    });

    test('enabled: mints a key and invalidates the old one on success', async () => {
      mockPit([so('id-1', { enabled: true, apiKey: 'old-key', scheduledTaskId: 'task-1' })]);

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1', { name: 'on' })],
      });

      expect(rulesClientParams.createAPIKey).toHaveBeenCalledTimes(1);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
        { apiKeys: ['old-key'] },
        expect.anything(),
        expect.anything()
      );
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: 'id-1',
            attributes: expect.objectContaining({ enabled: true }),
          }),
        ],
        { overwrite: true }
      );
      expect(result.successfulIds).toEqual(['id-1']);
      expect(result.errors).toEqual([]);
    });

    test('mixed on/off: keys only for enabled; enabled never flipped', async () => {
      mockPit([so('id-1', { enabled: true, apiKey: 'old-1' }), so('id-2', { enabled: false })]);

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1', { name: 'on' }), item('id-2', { name: 'off' })],
      });

      expect(rulesClientParams.createAPIKey).toHaveBeenCalledTimes(1);
      const written = unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0] as Array<{
        id: string;
        attributes: { enabled: boolean };
      }>;
      expect(written.find((o) => o.id === 'id-1')?.attributes.enabled).toBe(true);
      expect(written.find((o) => o.id === 'id-2')?.attributes.enabled).toBe(false);
      expect(result.successfulIds).toHaveLength(2);
      expect(result.successfulIds).toEqual(expect.arrayContaining(['id-1', 'id-2']));
    });

    test('disabled + interval change + scheduledTaskId still reschedules TM', async () => {
      mockPit([
        so('id-1', { enabled: false, scheduledTaskId: 'task-1', schedule: { interval: '5m' } }),
      ]);

      await rulesClient.bulkUpdateRules({
        rules: [item('id-1', { schedule: { interval: '1h' } })],
      });

      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledWith(['task-1'], { interval: '1h' });
    });
  });

  describe('input validation and batching', () => {
    test(`rejects with 400 when rules.length exceeds MAX_RULES_NUMBER_FOR_BULK_OPERATION (${MAX_RULES_NUMBER_FOR_BULK_OPERATION})`, async () => {
      const over = MAX_RULES_NUMBER_FOR_BULK_OPERATION + 1;
      await expect(
        rulesClient.bulkUpdateRules({
          rules: Array.from({ length: over }, (_, i) => item(`id-${i}`)),
        })
      ).rejects.toThrow(
        `${over} rules exceeds the hard limit of ${MAX_RULES_NUMBER_FOR_BULK_OPERATION}`
      );
      expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    });

    test('throws 400 when batchSize exceeds MAX_BULK_UPDATE_BATCH_SIZE', async () => {
      await expect(
        rulesClient.bulkUpdateRules({
          rules: [item('id-1')],
          batchSize: MAX_BULK_UPDATE_BATCH_SIZE + 1,
        })
      ).rejects.toThrow(`batchSize ${MAX_BULK_UPDATE_BATCH_SIZE + 1} exceeds the maximum`);
      expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    });

    test('throws 400 when batchSize is below MIN_BULK_UPDATE_BATCH_SIZE', async () => {
      await expect(
        rulesClient.bulkUpdateRules({
          rules: [item('id-1')],
          batchSize: MIN_BULK_UPDATE_BATCH_SIZE - 1,
        })
      ).rejects.toThrow(`is below the minimum of ${MIN_BULK_UPDATE_BATCH_SIZE}`);
      expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    });

    test('throws 400 when batchSize is NaN', async () => {
      await expect(
        rulesClient.bulkUpdateRules({
          rules: [item('id-1')],
          batchSize: Number.NaN,
        })
      ).rejects.toThrow(`is below the minimum of ${MIN_BULK_UPDATE_BATCH_SIZE}`);
      expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    });

    test('splits rules across batches and concatenates results', async () => {
      mockPit(nSos(21));

      const result = await rulesClient.bulkUpdateRules({
        rules: nItems(21),
        batchSize: MIN_BULK_UPDATE_BATCH_SIZE,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(3);
      expect(result.successfulIds).toHaveLength(21);
      expect(result.errors).toEqual([]);
      expect(result.total).toBe(21);
    });
  });

  describe('load and missing ids', () => {
    test('missing id is a per-item error; others still write', async () => {
      mockPit([so('id-2')]);

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1'), item('id-2')],
      });

      expect(result.errors).toEqual([
        expect.objectContaining({
          message: 'Saved object [alert/id-1] not found',
          status: 404,
          rule: { id: 'id-1', name: 'name-id-1' },
        }),
      ]);
      expect(result.successfulIds).toEqual(['id-2']);
      expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
    });
  });

  describe('authorization', () => {
    test('deduped type/consumer pairs from loaded SOs, Update operation', async () => {
      mockPit([
        so('id-1', { alertTypeId: '123', consumer: 'siem' }),
        so('id-2', { alertTypeId: '123', consumer: 'siem' }),
        so('id-3', { alertTypeId: '123', consumer: 'other' }),
        so('id-4', { alertTypeId: '456', consumer: 'siem' }),
      ]);

      await rulesClient.bulkUpdateRules({
        rules: [item('id-1'), item('id-2'), item('id-3'), item('id-4')],
      });

      expect(authorization.bulkEnsureAuthorized).toHaveBeenCalledTimes(1);
      expect(authorization.bulkEnsureAuthorized).toHaveBeenCalledWith({
        ruleTypeIdConsumersPairs: [
          { ruleTypeId: '123', consumers: ['siem', 'other'] },
          { ruleTypeId: '456', consumers: ['siem'] },
        ],
        operation: WriteOperations.Update,
        entity: AlertingAuthorizationEntity.Rule,
      });
    });

    test('authz rejection throws, BULK_UPDATE failure audit, no write', async () => {
      mockPit([so('id-1'), so('id-2')]);
      (authorization.bulkEnsureAuthorized as jest.Mock).mockRejectedValueOnce(
        new Error('not authorized')
      );

      await expect(
        rulesClient.bulkUpdateRules({ rules: [item('id-1'), item('id-2')] })
      ).rejects.toThrow('not authorized');

      expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
      const failAudits = (auditLogger.log as jest.Mock).mock.calls
        .map(([event]) => event)
        .filter(
          (e: { event?: { action: string; outcome?: string } }) =>
            e?.event?.action === RuleAuditAction.BULK_UPDATE && e?.event?.outcome === 'failure'
        );
      expect(failAudits).toHaveLength(1);
    });

    test('authz throw on later batch: earlier batch already written, call throws (current behavior)', async () => {
      mockPit(nSos(20));
      (authorization.bulkEnsureAuthorized as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('not authorized'));

      await expect(
        rulesClient.bulkUpdateRules({
          rules: nItems(20),
          batchSize: MIN_BULK_UPDATE_BATCH_SIZE,
        })
      ).rejects.toThrow('not authorized');

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(10);
    });
  });

  describe('circuit breaker', () => {
    test('overflowing batch returns 400 errors, skips prepare/keys, leftover mapped, earlier ids kept', async () => {
      mockPit(
        nSos(10, { enabled: true, schedule: { interval: '1m' } }),
        nSos(10, { enabled: true, schedule: { interval: '1m' } }).map((_, i) =>
          so(`id-${i + 10}`, { enabled: true, schedule: { interval: '1m' } })
        ),
        nSos(10, { enabled: true, schedule: { interval: '1m' } }).map((_, i) =>
          so(`id-${i + 20}`, { enabled: true, schedule: { interval: '1m' } })
        )
      );
      (validateScheduleLimit as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ interval: 100, intervalAvailable: 50 });

      const result = await rulesClient.bulkUpdateRules({
        rules: nItems(30, { schedule: { interval: '5m' } }),
        batchSize: MIN_BULK_UPDATE_BATCH_SIZE,
      });

      expect(result.successfulIds).toHaveLength(10);
      expect(result.errors).toHaveLength(20);
      expect(result.errors.every((e) => e.status === 400)).toBe(true);
      expect(result.errors[0].message).toMatch(/cannot be bulk updated/i);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(rulesClientParams.createAPIKey).toHaveBeenCalledTimes(10);
      expect(bulkMigrateLegacyActions).toHaveBeenCalledTimes(1);
    });
  });

  describe('legacy actions migration', () => {
    test('migrate throw: log and continue, earlier batch ids kept', async () => {
      mockPit(
        nSos(10),
        nSos(10).map((_, i) => so(`id-${i + 10}`))
      );
      (bulkMigrateLegacyActions as jest.Mock)
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('es down'));

      const result = await rulesClient.bulkUpdateRules({
        rules: nItems(20),
        batchSize: MIN_BULK_UPDATE_BATCH_SIZE,
      });

      expect(result.successfulIds).toHaveLength(20);
      expect(result.errors).toEqual([]);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(2);
      expect(rulesClientParams.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('legacy actions migration failed, continuing')
      );
    });
  });

  describe('prepare', () => {
    test('per-rule schema failure is isolated; rest persist', async () => {
      mockPit([so('id-1'), so('id-2')]);

      const result = await rulesClient.bulkUpdateRules({
        rules: [
          item('id-1', { schedule: { interval: 'NOT_VALID' } }),
          item('id-2', { name: 'ok' }),
        ],
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule.id).toBe('id-1');
      expect(result.successfulIds).toEqual(['id-2']);
      expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
    });

    test('API key creation failure excludes that rule; others persist', async () => {
      mockPit([so('id-1', { enabled: true }), so('id-2', { enabled: true })]);
      rulesClientParams.createAPIKey.mockRejectedValueOnce(new Error('keys disabled'));

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1', { name: 'keyfail' }), item('id-2', { name: 'ok' })],
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule.name).toBe('keyfail');
      expect(result.successfulIds).toEqual(['id-2']);
      expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
    });

    test('minimum-interval enforce=true: rule removed with 400; others persist', async () => {
      const enforceClient = new RulesClient({
        ...rulesClientParams,
        minimumScheduleInterval: { value: '1m', enforce: true },
      });
      mockPit([so('id-1'), so('id-2')]);

      const result = await enforceClient.bulkUpdateRules({
        rules: [
          item('id-1', { name: 'too-fast', schedule: { interval: '30s' } }),
          item('id-2', { name: 'ok' }),
        ],
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule.name).toBe('too-fast');
      expect(result.errors[0].message).toContain('less than the allowed minimum interval');
      expect(result.successfulIds).toEqual(['id-2']);
    });

    test('prepare failure after API key mint invalidates the orphaned key', async () => {
      mockPit([so('id-1', { enabled: true }), so('id-2', { enabled: true })]);
      (addMissingUiamKeyTagIfNeeded as jest.Mock).mockImplementationOnce(() => {
        throw new Error('uiam boom');
      });

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1', { name: 'orphan' }), item('id-2', { name: 'ok' })],
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule.name).toBe('orphan');
      expect(result.errors[0].message).toContain('uiam boom');
      expect(result.successfulIds).toEqual(['id-2']);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
        { apiKeys: expect.arrayContaining([expect.any(String)]) },
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('SO persistence', () => {
    test('per-row non-conflict error invalidates the new key, keeps the old one', async () => {
      mockPit([so('id-1', { enabled: true, apiKey: 'old-key' })]);
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([{ id: 'id-1', error: { message: 'es down', statusCode: 500 } }])
      );

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1', { name: 'fail' })],
      });

      expect(result.successfulIds).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].status).toBe(500);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
        { apiKeys: expect.arrayContaining([expect.any(String)]) },
        expect.anything(),
        expect.anything()
      );
      expect(bulkMarkApiKeysForInvalidation).not.toHaveBeenCalledWith(
        { apiKeys: expect.arrayContaining(['old-key']) },
        expect.anything(),
        expect.anything()
      );
    });

    test('whole-call throw invalidates new keys and does not rethrow', async () => {
      mockPit([so('id-1', { enabled: true }), so('id-2', { enabled: true })]);
      unsecuredSavedObjectsClient.bulkCreate.mockRejectedValueOnce(new Error('SO down'));

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1', { name: 'a' }), item('id-2', { name: 'b' })],
      });

      expect(result.successfulIds).toEqual([]);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.every((e) => e.message.includes('SO down'))).toBe(true);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    });

    test('409 reloads only conflicted ids and retries the same payload', async () => {
      mockPit(
        [so('id-1', { version: '1' } as never), so('id-2', { version: '1' } as never)],
        [so('id-2', { version: '2' } as never)]
      );
      unsecuredSavedObjectsClient.bulkCreate
        .mockResolvedValueOnce(
          buildBulkResponse([
            { id: 'id-1' },
            { id: 'id-2', error: { message: 'conflict', statusCode: 409 } },
          ])
        )
        .mockResolvedValueOnce(buildBulkResponse([{ id: 'id-2' }]));

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1'), item('id-2')],
      });

      expect(result.successfulIds).toEqual(['id-1', 'id-2']);
      expect(result.errors).toEqual([]);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(2);
      expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[1][0]).toHaveLength(1);
      expect(
        (unsecuredSavedObjectsClient.bulkCreate.mock.calls[1][0] as Array<{ id: string }>)[0].id
      ).toBe('id-2');
    });

    test('gives up after OCC retries are exhausted', async () => {
      mockPit([so('id-1')]);
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([{ id: 'id-1', error: { message: 'conflict', statusCode: 409 } }])
      );

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1', { name: 'conflicted' })],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(3);
      expect(result.successfulIds).toEqual([]);
      expect(result.errors).toEqual([
        {
          message: 'conflict',
          status: 409,
          rule: { id: 'id-1', name: 'conflicted' },
        },
      ]);
    });

    test('409 then missing on reload is a per-item error', async () => {
      mockPit([so('id-1'), so('id-2')], []);
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(
        buildBulkResponse([
          { id: 'id-1' },
          { id: 'id-2', error: { message: 'conflict', statusCode: 409 } },
        ])
      );

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1'), item('id-2')],
      });

      expect(result.successfulIds).toEqual(['id-1']);
      expect(result.errors).toEqual([
        expect.objectContaining({
          message: 'Saved object [alert/id-2] not found',
          status: 404,
          rule: { id: 'id-2', name: 'name-id-2' },
        }),
      ]);
    });
  });

  describe('task schedules', () => {
    test('same new interval is one TM call; two intervals are two', async () => {
      mockPit([
        so('id-1', { scheduledTaskId: 'task-1', schedule: { interval: '1m' } }),
        so('id-2', { scheduledTaskId: 'task-2', schedule: { interval: '1m' } }),
      ]);

      await rulesClient.bulkUpdateRules({
        rules: [
          item('id-1', { schedule: { interval: '5m' } }),
          item('id-2', { schedule: { interval: '5m' } }),
        ],
      });

      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledWith(
        expect.arrayContaining(['task-1', 'task-2']),
        { interval: '5m' }
      );

      jest.clearAllMocks();
      getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
      (bulkMigrateLegacyActions as jest.Mock).mockResolvedValue([]);
      (addMissingUiamKeyTagIfNeeded as jest.Mock).mockImplementation((...args: unknown[]) =>
        actualAddUiam(...(args as Parameters<typeof actualAddUiam>))
      );
      echoBulkCreate();
      rulesClient = new RulesClient(rulesClientParams);
      mockPit([
        so('id-1', { scheduledTaskId: 'task-1', schedule: { interval: '1m' } }),
        so('id-2', { scheduledTaskId: 'task-2', schedule: { interval: '1m' } }),
      ]);

      await rulesClient.bulkUpdateRules({
        rules: [
          item('id-1', { schedule: { interval: '5m' } }),
          item('id-2', { schedule: { interval: '10m' } }),
        ],
      });

      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledTimes(2);
    });

    test('TM fail after save: still successfulIds, error logged', async () => {
      mockPit([so('id-1', { scheduledTaskId: 'task-1', schedule: { interval: '1m' } })]);
      taskManager.bulkUpdateSchedules.mockRejectedValueOnce(new Error('TM down'));

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1', { schedule: { interval: '5m' } })],
      });

      expect(result.successfulIds).toEqual(['id-1']);
      expect(result.errors).toEqual([]);
      expect((rulesClientParams.logger.error as jest.Mock).mock.calls).toEqual(
        expect.arrayContaining([expect.arrayContaining([expect.stringContaining('TM down')])])
      );
    });
  });

  describe('exitEarlyOnError', () => {
    test('SO error in batch 1 skips leftover batches and keeps prior successes', async () => {
      mockPit(nSos(20));
      unsecuredSavedObjectsClient.bulkCreate.mockImplementation(async (objects) => {
        const ids = (objects as Array<{ id: string }>).map((o) => ({
          id: o.id,
          ...(o.id === 'id-0' ? { error: { message: 'es down', statusCode: 500 } } : {}),
        }));
        return buildBulkResponse(ids);
      });

      const result = await rulesClient.bulkUpdateRules({
        rules: nItems(20),
        batchSize: MIN_BULK_UPDATE_BATCH_SIZE,
        exitEarlyOnError: true,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(result.successfulIds).toHaveLength(9);
      expect(result.errors).toHaveLength(1);
      expect(result.total).toBe(20);
    });

    test('prepare error aborts the current batch (no write)', async () => {
      mockPit([so('id-1'), so('id-2')]);

      const result = await rulesClient.bulkUpdateRules({
        rules: [
          item('id-1', { schedule: { interval: 'NOT_VALID' } }),
          item('id-2', { name: 'ok' }),
        ],
        exitEarlyOnError: true,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
      expect(result.successfulIds).toEqual([]);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('allowMissingConnectorSecrets', () => {
    const slackAction = { group: 'default', id: '1', params: { foo: true } };
    const missingSecrets = () =>
      createMockConnector({
        id: '1',
        actionTypeId: '.slack',
        isMissingSecrets: true,
        name: 'Slack connector',
      });

    test('rejects the rule when an action connector is missing secrets', async () => {
      actionsClient.getBulk.mockReset();
      actionsClient.getBulk.mockResolvedValue([missingSecrets()]);
      mockPit([so('id-1')]);

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1', { actions: [slackAction], notifyWhen: 'onActiveAlert' })],
      });

      expect(result.successfulIds).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule.id).toBe('id-1');
      expect(result.errors[0].message).toContain('Invalid connectors: Slack connector');
      expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    });

    test('updates the rule when allowMissingConnectorSecrets is true', async () => {
      actionsClient.getBulk.mockReset();
      actionsClient.getBulk.mockResolvedValue([missingSecrets()]);
      mockPit([so('id-1')]);

      const result = await rulesClient.bulkUpdateRules({
        rules: [item('id-1', { actions: [slackAction], notifyWhen: 'onActiveAlert' })],
        allowMissingConnectorSecrets: true,
      });

      expect(result.errors).toEqual([]);
      expect(result.successfulIds).toEqual(['id-1']);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(rulesClientParams.logger.error).toHaveBeenCalledWith(
        'Invalid connectors with "allowMissingConnectorSecrets": Slack connector'
      );
    });

    test('isolates a missing-secrets failure from other rules in the batch', async () => {
      actionsClient.getBulk.mockReset();
      actionsClient.getBulk.mockResolvedValue([missingSecrets()]);
      mockPit([so('id-1'), so('id-2')]);

      const result = await rulesClient.bulkUpdateRules({
        rules: [
          item('id-1', {
            name: 'bad-actions',
            actions: [slackAction],
            notifyWhen: 'onActiveAlert',
          }),
          item('id-2', { name: 'ok' }),
        ],
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule.name).toBe('bad-actions');
      expect(result.errors[0].message).toContain('Invalid connectors');
      expect(result.successfulIds).toEqual(['id-2']);
    });
  });

  describe('audit', () => {
    test('emits BULK_UPDATE for persisted rules', async () => {
      mockPit([so('id-1')]);

      await rulesClient.bulkUpdateRules({ rules: [item('id-1')] });

      const events = (auditLogger.log as jest.Mock).mock.calls
        .map(([event]) => event)
        .filter(
          (e: { event?: { action: string } }) => e?.event?.action === RuleAuditAction.BULK_UPDATE
        );
      expect(events).toHaveLength(1);
      expect(events[0].kibana?.saved_object).toEqual(
        expect.objectContaining({ type: RULE_SAVED_OBJECT_TYPE, id: 'id-1' })
      );
    });
  });

  describe('change tracking', () => {
    const createChangeTrackingService = () => ({
      log: jest.fn().mockResolvedValue(undefined),
      logBulk: jest.fn().mockResolvedValue(undefined),
      getHistory: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    });

    const setRuleType = (overrides: { trackChanges?: boolean } = {}) => {
      ruleTypeRegistry.get.mockReturnValue({
        id: '123',
        name: 'Test',
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        executor: jest.fn(),
        category: 'test',
        validate: { params: { validate: (params: unknown) => params } },
        solution: 'stack',
        validLegacyConsumers: [],
        trackChanges: true,
        ...overrides,
      } as never);
    };

    test('defaults to ruleUpdate and only logs successes', async () => {
      const changeTrackingService = createChangeTrackingService();
      const trackingClient = new RulesClient({ ...rulesClientParams, changeTrackingService });
      setRuleType();
      mockPit([so('id-1'), so('id-2')]);
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(
        buildBulkResponse([
          { id: 'id-1' },
          { id: 'id-2', error: { message: 'es down', statusCode: 500 } },
        ])
      );

      await trackingClient.bulkUpdateRules({
        rules: [item('id-1'), item('id-2')],
      });

      expect(changeTrackingService.logBulk).toHaveBeenCalledTimes(1);
      expect(changeTrackingService.logBulk).toHaveBeenCalledWith(
        [expect.objectContaining({ objectId: 'id-1' })],
        expect.objectContaining({ action: RuleChangeTrackingAction.ruleUpdate })
      );
    });
  });
});
