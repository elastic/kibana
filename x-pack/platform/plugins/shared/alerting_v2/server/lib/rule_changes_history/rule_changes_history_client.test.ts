/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryClient, ChangeHistoryDocument } from '@kbn/change-history';
import {
  getRuleChangeHistoryEventParamsSchema,
  listRuleChangeHistoryRequestSchema,
  listRuleChangeHistoryResponseSchema,
  ruleChangeHistoryDetailSchema,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { RuleChangesHistoryClient } from './rule_changes_history_client';

const createDocument = (
  overrides: Partial<{
    id: string;
    timestamp: string;
    action: string;
    sequence: number;
    snapshot: Record<string, unknown>;
    userName: string;
    userId: string;
    reason: string;
  }> = {}
): ChangeHistoryDocument =>
  ({
    '@timestamp': overrides.timestamp ?? '2026-01-15T12:00:00.000Z',
    ecs: { version: '9.3.0' },
    user: {
      name: overrides.userName ?? 'elastic',
      ...(overrides.userId ? { id: overrides.userId } : {}),
    },
    event: {
      id: overrides.id ?? 'event-1',
      module: 'alerting-v2',
      dataset: 'rules',
      action: overrides.action ?? 'rule_update',
      type: 'change',
      ...(overrides.reason ? { reason: overrides.reason } : {}),
    },
    object: {
      id: 'rule-1',
      type: 'alerting_rule',
      hash: 'abc',
      sequence: overrides.sequence ?? 1,
      fields: { hashed: [], redacted: [] },
      snapshot: overrides.snapshot ?? { id: 'rule-1', metadata: { name: 'Rule' } },
    },
    service: { type: 'kibana', version: '9.0.0' },
  } as ChangeHistoryDocument);

const createChangeHistoryMock = (): jest.Mocked<
  Pick<ChangeHistoryClient, 'isInitialized' | 'getHistory'>
> => ({
  isInitialized: jest.fn().mockReturnValue(true),
  getHistory: jest.fn().mockResolvedValue({ items: [], total: 0 }),
});

describe('RuleChangesHistoryClient', () => {
  describe('listRuleChanges', () => {
    it('over-fetches by one and diffs each row against its predecessor', async () => {
      const changeHistory = createChangeHistoryMock();
      const newest = createDocument({
        id: 'event-2',
        sequence: 2,
        snapshot: { id: 'rule-1', metadata: { name: 'B' } },
        timestamp: '2026-01-15T12:05:00.000Z',
      });
      const older = createDocument({
        id: 'event-1',
        sequence: 1,
        snapshot: { id: 'rule-1', metadata: { name: 'A' } },
      });
      changeHistory.getHistory.mockResolvedValue({ items: [newest, older], total: 2 });

      const client = new RuleChangesHistoryClient(
        changeHistory as unknown as ChangeHistoryClient,
        'default'
      );

      const result = await client.listRuleChanges({ ruleId: 'rule-1', page: 1, perPage: 1 });

      expect(changeHistory.getHistory).toHaveBeenCalledWith('default', 'alerting_rule', 'rule-1', {
        from: 0,
        size: 2,
      });
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'event-2',
        isCurrent: true,
        changes: {
          count: 1,
          summary: { metadata: { name: 'A' } },
        },
        metadata: { version: 2 },
      });
      // Snapshot must not appear on list rows.
      expect(result.items[0]).not.toHaveProperty('snapshot');
    });

    it('does not mark items as current on pages after the first', async () => {
      const changeHistory = createChangeHistoryMock();
      changeHistory.getHistory.mockResolvedValue({
        items: [createDocument({ id: 'event-3', sequence: 3 })],
        total: 3,
      });

      const client = new RuleChangesHistoryClient(
        changeHistory as unknown as ChangeHistoryClient,
        'default'
      );

      const result = await client.listRuleChanges({ ruleId: 'rule-1', page: 2, perPage: 1 });

      expect(result.items[0].isCurrent).toBeUndefined();
      expect(changeHistory.getHistory).toHaveBeenCalledWith('default', 'alerting_rule', 'rule-1', {
        from: 1,
        size: 2,
      });
    });

    it('throws RULE_CHANGE_HISTORY_UNAVAILABLE when the data stream is not initialized', async () => {
      const changeHistory = createChangeHistoryMock();
      changeHistory.isInitialized.mockReturnValue(false);

      const client = new RuleChangesHistoryClient(
        changeHistory as unknown as ChangeHistoryClient,
        'default'
      );

      await expect(
        client.listRuleChanges({ ruleId: 'rule-1', page: 1, perPage: 20 })
      ).rejects.toMatchObject({
        output: { statusCode: 503 },
        data: { code: ALERTING_ERROR_CODES.RULE_CHANGE_HISTORY_UNAVAILABLE },
      });
      expect(changeHistory.getHistory).not.toHaveBeenCalled();
    });
  });

  describe('getRuleChange', () => {
    it('returns detail with snapshot and diffs against the previous entry', async () => {
      const changeHistory = createChangeHistoryMock();
      const current = createDocument({
        id: 'event-2',
        sequence: 2,
        snapshot: { id: 'rule-1', metadata: { name: 'B' } },
        userId: 'u_1',
        reason: 'renamed',
      });
      const previous = createDocument({
        id: 'event-1',
        sequence: 1,
        snapshot: { id: 'rule-1', metadata: { name: 'A' } },
      });

      changeHistory.getHistory
        .mockResolvedValueOnce({ items: [current], total: 1 })
        .mockResolvedValueOnce({ items: [previous], total: 1 })
        .mockResolvedValueOnce({ items: [current], total: 1 });

      const client = new RuleChangesHistoryClient(
        changeHistory as unknown as ChangeHistoryClient,
        'default'
      );

      const result = await client.getRuleChange({ ruleId: 'rule-1', eventId: 'event-2' });

      expect(result).toMatchObject({
        id: 'event-2',
        actor: { name: 'elastic', profileId: 'u_1' },
        comment: 'renamed',
        reason: 'renamed',
        isCurrent: true,
        changes: {
          count: 1,
          summary: { metadata: { name: 'A' } },
        },
        snapshot: { id: 'rule-1', metadata: { name: 'B' } },
      });
    });

    it('throws RULE_CHANGE_NOT_FOUND when the event is missing', async () => {
      const changeHistory = createChangeHistoryMock();
      changeHistory.getHistory.mockResolvedValue({ items: [], total: 0 });

      const client = new RuleChangesHistoryClient(
        changeHistory as unknown as ChangeHistoryClient,
        'default'
      );

      await expect(
        client.getRuleChange({ ruleId: 'rule-1', eventId: 'missing' })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
        data: {
          code: ALERTING_ERROR_CODES.RULE_CHANGE_NOT_FOUND,
          details: { rule_id: 'rule-1', event_id: 'missing' },
        },
      });
    });
  });
});

describe('rule change history schemas', () => {
  it('parses a valid list query and rejects an oversized result window', () => {
    expect(listRuleChangeHistoryRequestSchema.parse({})).toEqual({ page: 1, per_page: 20 });
    expect(listRuleChangeHistoryRequestSchema.safeParse({ page: 501, per_page: 20 }).success).toBe(
      false
    );
  });

  it('parses list and detail response shapes', () => {
    expect(
      listRuleChangeHistoryResponseSchema.safeParse({
        items: [
          {
            id: 'event-1',
            timestamp: '2026-01-15T12:00:00.000Z',
            actor: { name: 'elastic' },
            action: 'rule_create',
          },
        ],
        total: 1,
      }).success
    ).toBe(true);

    expect(
      ruleChangeHistoryDetailSchema.safeParse({
        id: 'event-1',
        timestamp: '2026-01-15T12:00:00.000Z',
        actor: { name: 'elastic' },
        action: 'rule_create',
        snapshot: { id: 'rule-1', metadata: { name: 'Rule' } },
      }).success
    ).toBe(true);
  });

  it('parses detail path params', () => {
    expect(
      getRuleChangeHistoryEventParamsSchema.parse({ id: 'rule-1', eventId: 'event-1' })
    ).toEqual({ id: 'rule-1', eventId: 'event-1' });
  });
});
