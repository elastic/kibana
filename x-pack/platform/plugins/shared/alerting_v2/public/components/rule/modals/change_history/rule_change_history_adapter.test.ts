/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleChangeHistoryApi } from '../../../../services/rule_change_history_api';
import { createRuleChangeHistoryAdapter } from './rule_change_history_adapter';

const createApiMock = () =>
  ({
    listRuleChanges: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    getRuleChangeEvent: jest.fn().mockResolvedValue({
      id: 'evt-1',
      timestamp: '2026-01-01T00:00:00.000Z',
      actor: { name: 'elastic' },
      action: 'update',
      snapshot: {},
    }),
  }) as unknown as jest.Mocked<RuleChangeHistoryApi>;

describe('createRuleChangeHistoryAdapter', () => {
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

    it('returns only items and total (drops other response fields)', async () => {
      const api = createApiMock();
      const response = {
        items: [
          {
            id: 'evt-1',
            timestamp: '2026-01-01T00:00:00.000Z',
            actor: { name: 'elastic' },
            action: 'update',
          },
        ],
        total: 1,
      };
      api.listRuleChanges.mockResolvedValueOnce(response);
      const adapter = createRuleChangeHistoryAdapter(api);

      await expect(
        adapter.listChanges({ objectId: 'rule-1', page: { index: 0, size: 20 } })
      ).resolves.toEqual(response);
    });

    it('maps the response from the API to the UI contract', async () => {
      const api = createApiMock();
      api.listRuleChanges.mockResolvedValueOnce({
        items: [
          {
            id: 'evt-1',
            timestamp: '2026-01-01T00:00:00.000Z',
            actor: { name: 'elastic', profile_id: 'u_1' },
            action: 'update',
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
        action: 'update',
        isCurrent: true,
      });
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
    it('maps objectId/changeId to id/eventId and forwards the signal', async () => {
      const api = createApiMock();
      const adapter = createRuleChangeHistoryAdapter(api);
      const signal = new AbortController().signal;

      await adapter.getChange({ objectId: 'rule-1', changeId: 'evt-1', signal });

      expect(api.getRuleChangeEvent).toHaveBeenCalledWith({
        id: 'rule-1',
        eventId: 'evt-1',
        signal,
      });
    });

    it('maps the snake_case wire keys and keeps the snapshot and reason', async () => {
      const api = createApiMock();
      api.getRuleChangeEvent.mockResolvedValueOnce({
        id: 'evt-1',
        timestamp: '2026-01-01T00:00:00.000Z',
        actor: { name: 'elastic', profile_id: 'u_1' },
        action: 'update',
        is_current: true,
        reason: 'renamed',
        snapshot: { name: 'rule' },
      });
      const adapter = createRuleChangeHistoryAdapter(api);

      await expect(adapter.getChange({ objectId: 'rule-1', changeId: 'evt-1' })).resolves.toEqual({
        id: 'evt-1',
        timestamp: '2026-01-01T00:00:00.000Z',
        actor: { name: 'elastic', profileId: 'u_1' },
        action: 'update',
        isCurrent: true,
        reason: 'renamed',
        snapshot: { name: 'rule' },
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
});
