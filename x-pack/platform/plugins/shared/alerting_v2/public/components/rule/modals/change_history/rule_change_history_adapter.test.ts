/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleChangeHistoryApi } from '../../../../services/rule_change_history_api';
import { createRuleChangeHistoryAdapter } from './rule_change_history_adapter';
import { waitForRestoredHistoryEntry } from './wait_for_restored_history_entry';

jest.mock('./wait_for_restored_history_entry', () => ({
  waitForRestoredHistoryEntry: jest.fn(),
}));

const mockWaitForRestoredHistoryEntry = jest.mocked(waitForRestoredHistoryEntry);

const createApiMock = () =>
  ({
    listRuleChanges: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    getRuleChangeEvent: jest.fn().mockResolvedValue({
      id: 'evt-1',
      created_at: '2026-01-01T00:00:00.000Z',
      actor: { name: 'elastic' },
      action: 'rule_update',
      snapshot: {},
    }),
    restoreRuleChange: jest.fn().mockResolvedValue({ id: 'rule-1', version: 3 }),
  } as unknown as jest.Mocked<RuleChangeHistoryApi>);

describe('createRuleChangeHistoryAdapter', () => {
  beforeEach(() => {
    mockWaitForRestoredHistoryEntry.mockReset().mockResolvedValue(undefined);
  });

  describe('listChanges', () => {
    it('maps the 0-based page index to the 1-based API page and forwards size/signal', async () => {
      const api = createApiMock();
      const adapter = createRuleChangeHistoryAdapter(api);
      const signal = new AbortController().signal;

      await adapter.listChanges({
        objectId: 'rule-1',
        page: { index: 0, size: 20 },
        signal,
      });

      expect(api.listRuleChanges).toHaveBeenCalledWith({
        id: 'rule-1',
        page: 1,
        perPage: 20,
        signal,
      });
    });

    it('increments subsequent page indexes', async () => {
      const api = createApiMock();
      const adapter = createRuleChangeHistoryAdapter(api);

      await adapter.listChanges({ objectId: 'rule-1', page: { index: 2, size: 25 } });

      expect(api.listRuleChanges).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, perPage: 25 })
      );
    });

    it('returns only the mapped items and the total', async () => {
      const api = createApiMock();
      api.listRuleChanges.mockResolvedValueOnce({
        items: [
          {
            id: 'evt-1',
            created_at: '2026-01-01T00:00:00.000Z',
            actor: { name: 'elastic' },
            action: 'rule_update',
          },
        ],
        total: 1,
      });
      const adapter = createRuleChangeHistoryAdapter(api);

      await expect(
        adapter.listChanges({ objectId: 'rule-1', page: { index: 0, size: 20 } })
      ).resolves.toEqual({
        items: [
          {
            id: 'evt-1',
            timestamp: '2026-01-01T00:00:00.000Z',
            actor: { name: 'elastic' },
            action: 'rule_update',
          },
        ],
        total: 1,
      });
    });

    it('maps the response from the API to the UI contract', async () => {
      const api = createApiMock();
      api.listRuleChanges.mockResolvedValueOnce({
        items: [
          {
            id: 'evt-1',
            created_at: '2026-01-01T00:00:00.000Z',
            actor: { name: 'elastic', profile_id: 'u_1' },
            action: 'rule_update',
            is_current: true,
          },
        ],
        total: 1,
      });
      const adapter = createRuleChangeHistoryAdapter(api);

      const { items } = await adapter.listChanges({
        objectId: 'rule-1',
        page: { index: 0, size: 20 },
      });

      expect(items[0]).toEqual({
        id: 'evt-1',
        timestamp: '2026-01-01T00:00:00.000Z',
        actor: { name: 'elastic', profileId: 'u_1' },
        action: 'rule_update',
        isCurrent: true,
      });
    });

    it('rebuilds the metadata bag the package reads for version-distance telemetry', async () => {
      const api = createApiMock();
      api.listRuleChanges.mockResolvedValueOnce({
        items: [
          {
            id: 'evt-1',
            created_at: '2026-01-01T00:00:00.000Z',
            actor: { name: 'elastic' },
            action: 'rule_update',
            version: 7,
          },
        ],
        total: 1,
      });
      const adapter = createRuleChangeHistoryAdapter(api);

      const { items } = await adapter.listChanges({
        objectId: 'rule-1',
        page: { index: 0, size: 20 },
      });

      expect(items[0].metadata).toEqual({ version: 7 });
    });

    it('propagates errors', async () => {
      const api = createApiMock();
      api.listRuleChanges.mockRejectedValueOnce(new Error('boom'));
      const adapter = createRuleChangeHistoryAdapter(api);

      await expect(
        adapter.listChanges({ objectId: 'rule-1', page: { index: 0, size: 20 } })
      ).rejects.toThrow('boom');
    });
  });

  describe('getChange', () => {
    it('maps changeId to eventId and forwards the signal', async () => {
      const api = createApiMock();
      const adapter = createRuleChangeHistoryAdapter(api);
      const signal = new AbortController().signal;

      await adapter.getChange({ objectId: 'rule-1', changeId: 'evt-1', signal });

      expect(api.getRuleChangeEvent).toHaveBeenCalledWith({
        eventId: 'evt-1',
        signal,
      });
    });

    it('maps the snake_case wire keys and keeps the snapshot and reason', async () => {
      const api = createApiMock();
      api.getRuleChangeEvent.mockResolvedValueOnce({
        id: 'evt-1',
        created_at: '2026-01-01T00:00:00.000Z',
        actor: { name: 'elastic', profile_id: 'u_1' },
        action: 'rule_update',
        is_current: true,
        reason: 'renamed',
        snapshot: { name: 'rule' },
        version: 7,
      });
      const adapter = createRuleChangeHistoryAdapter(api);

      await expect(adapter.getChange({ objectId: 'rule-1', changeId: 'evt-1' })).resolves.toEqual({
        id: 'evt-1',
        timestamp: '2026-01-01T00:00:00.000Z',
        actor: { name: 'elastic', profileId: 'u_1' },
        action: 'rule_update',
        isCurrent: true,
        reason: 'renamed',
        snapshot: { name: 'rule' },
        metadata: { version: 7 },
      });
    });

    it('propagates errors', async () => {
      const api = createApiMock();
      api.getRuleChangeEvent.mockRejectedValueOnce(new Error('nope'));
      const adapter = createRuleChangeHistoryAdapter(api);

      await expect(adapter.getChange({ objectId: 'rule-1', changeId: 'evt-1' })).rejects.toThrow(
        'nope'
      );
    });
  });

  describe('restoreChange', () => {
    it('restores the change by id and reports the restored rule', async () => {
      const api = createApiMock();
      const onRestored = jest.fn();
      const adapter = createRuleChangeHistoryAdapter(api, { onRestored });
      const signal = new AbortController().signal;

      await adapter.restoreChange?.({ objectId: 'rule-1', changeId: 'evt-1', signal });

      expect(api.restoreRuleChange).toHaveBeenCalledWith({ eventId: 'evt-1', signal });
      expect(onRestored).toHaveBeenCalledWith({ id: 'rule-1', version: 3 });
    });

    it('resolves only after the restored version is listed in the change history', async () => {
      const api = createApiMock();
      const onRestored = jest.fn();
      const adapter = createRuleChangeHistoryAdapter(api, { onRestored });
      const signal = new AbortController().signal;
      let finishWaiting: () => void = () => {};
      mockWaitForRestoredHistoryEntry.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          finishWaiting = resolve;
        })
      );

      const restoring = adapter.restoreChange?.({
        objectId: 'rule-1',
        changeId: 'evt-1',
        signal,
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(mockWaitForRestoredHistoryEntry).toHaveBeenCalledWith({
        api,
        ruleId: 'rule-1',
        version: 3,
        signal,
      });
      expect(onRestored).not.toHaveBeenCalled();

      finishWaiting();
      await restoring;

      expect(onRestored).toHaveBeenCalledTimes(1);
    });

    it('does not report a restore whose wait for the history entry was aborted', async () => {
      const api = createApiMock();
      const onRestored = jest.fn();
      const adapter = createRuleChangeHistoryAdapter(api, { onRestored });
      mockWaitForRestoredHistoryEntry.mockRejectedValueOnce(new Error('aborted'));

      await expect(
        adapter.restoreChange?.({ objectId: 'rule-1', changeId: 'evt-1' })
      ).rejects.toThrow('aborted');
      expect(onRestored).not.toHaveBeenCalled();
    });

    it('does not report a restore that failed', async () => {
      const api = createApiMock();
      api.restoreRuleChange.mockRejectedValueOnce(new Error('conflict'));
      const onRestored = jest.fn();
      const adapter = createRuleChangeHistoryAdapter(api, { onRestored });

      await expect(
        adapter.restoreChange?.({ objectId: 'rule-1', changeId: 'evt-1' })
      ).rejects.toThrow('conflict');
      expect(mockWaitForRestoredHistoryEntry).not.toHaveBeenCalled();
      expect(onRestored).not.toHaveBeenCalled();
    });
  });
});
