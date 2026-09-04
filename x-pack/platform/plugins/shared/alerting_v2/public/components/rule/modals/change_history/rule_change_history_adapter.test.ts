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
    getRuleChangeEvent: jest.fn().mockResolvedValue({ id: 'evt-1', snapshot: {} }),
  } as unknown as jest.Mocked<RuleChangeHistoryApi>);

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

    it('returns the detail from the API', async () => {
      const api = createApiMock();
      const detail = {
        id: 'evt-1',
        timestamp: '2026-01-01T00:00:00.000Z',
        actor: { name: 'elastic' },
        action: 'update',
        snapshot: { name: 'rule' },
      };
      api.getRuleChangeEvent.mockResolvedValueOnce(detail);
      const adapter = createRuleChangeHistoryAdapter(api);

      await expect(adapter.getChange({ objectId: 'rule-1', changeId: 'evt-1' })).resolves.toEqual(
        detail
      );
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
