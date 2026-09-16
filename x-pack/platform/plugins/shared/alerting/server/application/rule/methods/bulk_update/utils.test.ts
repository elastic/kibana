/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { RawRule } from '../../../../types';
import type { BulkOperationError } from '../../../../rules_client/types';
import { loadPending, loadRulesByIds, prepareUpdate, updateTaskSchedules } from './utils';
import type { PreparedUpdate } from './types';

const so = (id: string): SavedObject<RawRule> =>
  ({
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
    },
  } as unknown as SavedObject<RawRule>);

describe('bulkUpdate utils', () => {
  describe('loadRulesByIds', () => {
    it('returns empty without opening a PIT finder', async () => {
      const createFinder = jest.fn();
      const context = {
        encryptedSavedObjectsClient: {
          createPointInTimeFinderDecryptedAsInternalUser: createFinder,
        },
      } as unknown as RulesClientContext;

      await expect(loadRulesByIds(context, [])).resolves.toEqual([]);
      expect(createFinder).not.toHaveBeenCalled();
    });

    it('concatenates PIT pages and closes the finder', async () => {
      const close = jest.fn();
      const context = {
        encryptedSavedObjectsClient: {
          createPointInTimeFinderDecryptedAsInternalUser: jest.fn().mockResolvedValue({
            close,
            async *find() {
              yield { saved_objects: [so('id-1')] };
              yield { saved_objects: [so('id-2')] };
            },
          }),
        },
      } as unknown as RulesClientContext;

      const loaded = await loadRulesByIds(context, ['id-1', 'id-2']);
      expect(loaded.map((item) => item.id)).toEqual(['id-1', 'id-2']);
      expect(close).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadPending', () => {
    it('records a 404 for ids that the PIT load missed', async () => {
      const context = {
        encryptedSavedObjectsClient: {
          createPointInTimeFinderDecryptedAsInternalUser: jest.fn().mockResolvedValue({
            close: jest.fn(),
            async *find() {
              yield { saved_objects: [so('id-1')] };
            },
          }),
        },
      } as unknown as RulesClientContext;
      const errors: BulkOperationError[] = [];
      const byId = new Map([
        ['id-1', { id: 'id-1', data: { name: 'one' } }],
        ['id-2', { id: 'id-2', data: { name: 'two' } }],
      ]);

      const pending = await loadPending(context, byId as never, ['id-1', 'id-2'], errors);

      expect(pending).toHaveLength(1);
      expect(pending[0].item.id).toBe('id-1');
      expect(errors).toEqual([
        expect.objectContaining({
          status: 404,
          rule: { id: 'id-2', name: 'two' },
        }),
      ]);
    });
  });

  describe('updateTaskSchedules', () => {
    const prepared = (
      overrides: Partial<PreparedUpdate> & Pick<PreparedUpdate, 'id'>
    ): PreparedUpdate => ({
      name: overrides.id,
      rawRule: {} as RawRule,
      references: [],
      previousSchedule: { interval: '1m' },
      newSchedule: { interval: '1m' },
      oldKeys: { apiKey: null, uiamApiKey: null, apiKeyCreatedByUser: null },
      ...overrides,
    });

    it('skips rules with no scheduledTaskId or unchanged interval', async () => {
      const bulkUpdateSchedules = jest.fn();
      const context = {
        taskManager: { bulkUpdateSchedules },
        logger: { debug: jest.fn(), error: jest.fn() },
      } as unknown as RulesClientContext;

      await updateTaskSchedules(context, [
        prepared({ id: 'id-1' }),
        prepared({
          id: 'id-2',
          scheduledTaskId: 'task-2',
          previousSchedule: { interval: '5m' },
          newSchedule: { interval: '5m' },
        }),
      ]);

      expect(bulkUpdateSchedules).not.toHaveBeenCalled();
    });

    it('groups task ids by the new interval', async () => {
      const bulkUpdateSchedules = jest.fn().mockResolvedValue(undefined);
      const context = {
        taskManager: { bulkUpdateSchedules },
        logger: { debug: jest.fn(), error: jest.fn() },
      } as unknown as RulesClientContext;

      await updateTaskSchedules(context, [
        prepared({
          id: 'id-1',
          scheduledTaskId: 'task-1',
          newSchedule: { interval: '1h' },
        }),
        prepared({
          id: 'id-2',
          scheduledTaskId: 'task-2',
          newSchedule: { interval: '1h' },
        }),
        prepared({
          id: 'id-3',
          scheduledTaskId: 'task-3',
          newSchedule: { interval: '5m' },
        }),
      ]);

      expect(bulkUpdateSchedules).toHaveBeenCalledTimes(2);
      expect(bulkUpdateSchedules).toHaveBeenCalledWith(['task-1', 'task-2'], { interval: '1h' });
      expect(bulkUpdateSchedules).toHaveBeenCalledWith(['task-3'], { interval: '5m' });
    });

    it('logs and swallows Task Manager errors', async () => {
      const bulkUpdateSchedules = jest.fn().mockRejectedValue(new Error('tm down'));
      const error = jest.fn();
      const context = {
        taskManager: { bulkUpdateSchedules },
        logger: { debug: jest.fn(), error },
      } as unknown as RulesClientContext;

      await expect(
        updateTaskSchedules(context, [
          prepared({
            id: 'id-1',
            scheduledTaskId: 'task-1',
            newSchedule: { interval: '1h' },
          }),
        ])
      ).resolves.toBeUndefined();
      expect(error).toHaveBeenCalledWith(expect.stringContaining('tm down'));
    });
  });

  describe('prepareUpdate', () => {
    it('returns a per-item error when update data fails schema validation', async () => {
      const context = {
        ruleTypeRegistry: { ensureRuleTypeEnabled: jest.fn(), get: jest.fn() },
      } as unknown as RulesClientContext;

      const { prepared, error } = await prepareUpdate({
        context,
        actionsClient: {} as never,
        username: 'elastic',
        item: { id: 'id-1', data: { name: 'broken' } as never },
        original: so('id-1'),
        apiKeys: new Map(),
        invalidKeys: [],
      });

      expect(prepared).toBeUndefined();
      expect(error).toEqual(
        expect.objectContaining({
          status: 400,
          rule: { id: 'id-1', name: 'broken' },
          message: expect.stringContaining('Error validating update data'),
        })
      );
    });
  });
});
