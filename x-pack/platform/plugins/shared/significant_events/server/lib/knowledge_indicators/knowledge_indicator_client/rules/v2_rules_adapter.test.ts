/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ALERTING_V2_ERROR_CODES, type RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { RulesAdapterV2 } from './v2_rules_adapter';
import type { SignificantEventsRuleDefinition } from './rules_management_client';

function makeRulesClientMock() {
  return {
    createRule: jest.fn(),
    updateRule: jest.fn(),
    bulkDeleteRules: jest.fn(),
    findRules: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, perPage: 500 }),
  };
}

function makeAdapter(mock: ReturnType<typeof makeRulesClientMock>) {
  return new RulesAdapterV2(mock as unknown as RulesClientApi);
}

function lastCreateCall(mock: ReturnType<typeof makeRulesClientMock>) {
  const call = mock.createRule.mock.calls[mock.createRule.mock.calls.length - 1][0];
  return call;
}

function lastUpdateCall(mock: ReturnType<typeof makeRulesClientMock>) {
  const call = mock.updateRule.mock.calls[mock.updateRule.mock.calls.length - 1][0];
  return call;
}

const createDefinition: SignificantEventsRuleDefinition = {
  name: 'High error rate',
  streamName: 'my-stream',
  timestampField: '@timestamp',
  esqlQuery: 'FROM logs-* METADATA _id, _source | WHERE level == "error"',
  schedule: { interval: '1m' },
};

const updateDefinition: SignificantEventsRuleDefinition = {
  name: 'Updated title',
  streamName: 'my-stream',
  timestampField: '@timestamp',
  esqlQuery: 'FROM logs-* METADATA _id, _source | WHERE level == "error"',
  schedule: { interval: '1m' },
};

describe('RulesAdapterV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('v2 body mapping', () => {
    it('maps createRule body to v2 signal shape', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.createRule('rule-1', createDefinition);

      expect(lastCreateCall(mock).data).toEqual({
        kind: 'signal',
        metadata: {
          name: 'High error rate',
          tags: ['sigevents:stream:my-stream'],
        },
        time_field: '@timestamp',
        schedule: { every: '1m', lookback: '2m' },
        grouping: { fields: ['_id'] },
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* METADATA _id | WHERE level == "error" | LIMIT 1000' },
        },
      });
      expect(lastCreateCall(mock).options).toEqual({ id: 'rule-1' });
    });

    it('includes a 2-minute lookback for 1-minute rules', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.createRule('rule-1', createDefinition);

      const data = lastCreateCall(mock).data as Record<string, unknown>;
      expect((data.schedule as Record<string, unknown>).lookback).toBe('2m');
    });

    it('includes a 10-minute lookback for 5-minute rules', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.createRule('rule-1', {
        ...createDefinition,
        schedule: { interval: '5m' },
      });

      const data = lastCreateCall(mock).data as Record<string, unknown>;
      expect(data.schedule).toEqual({ every: '5m', lookback: '10m' });
    });

    it('groups by _id so overlapping windows dedupe per source document', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.createRule('rule-1', createDefinition);

      const data = lastCreateCall(mock).data as { grouping: { fields: string[] } };
      expect(data.grouping).toEqual({ fields: ['_id'] });
    });

    it('rejects STATS queries until rule-on-rule provisioning', async () => {
      const mock = makeRulesClientMock();
      const adapter = makeAdapter(mock);
      const statsQuery =
        'FROM logs-* | STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes) | WHERE count > 0';

      await expect(
        adapter.createRule('rule-stats', {
          ...createDefinition,
          esqlQuery: statsQuery,
        })
      ).rejects.toThrow('STATS queries cannot be installed as v2 signal rules');

      expect(mock.createRule).not.toHaveBeenCalled();
    });

    it('maps updateRule body to v2 partial shape (no kind)', async () => {
      const mock = makeRulesClientMock();
      mock.updateRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.updateRule('rule-1', updateDefinition);

      expect(lastUpdateCall(mock)).toEqual({
        id: 'rule-1',
        data: {
          metadata: {
            name: 'Updated title',
            tags: ['sigevents:stream:my-stream'],
          },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '2m' },
          grouping: { fields: ['_id'] },
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* METADATA _id | WHERE level == "error" | LIMIT 1000' },
          },
        },
      });
    });

    it('forwards timestampField as time_field in updateRule bodies', async () => {
      const mock = makeRulesClientMock();
      mock.updateRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.updateRule('rule-1', {
        ...updateDefinition,
        timestampField: 'event.ingested',
      });

      const data = lastUpdateCall(mock).data as { time_field: string };
      expect(data.time_field).toBe('event.ingested');
    });

    it('keeps grouping in updateRule bodies so dedup config stays in sync', async () => {
      const mock = makeRulesClientMock();
      mock.updateRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.updateRule('rule-1', updateDefinition);

      const data = lastUpdateCall(mock).data as { grouping: { fields: string[] } };
      expect(data.grouping).toEqual({ fields: ['_id'] });
    });

    it('derives a structured rule tag from the stream name', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.createRule('rule-1', {
        ...createDefinition,
        streamName: 'web-server.errors',
      });

      const data = lastCreateCall(mock).data as { metadata: { tags: string[] } };
      expect(data.metadata.tags).toEqual(['sigevents:stream:web-server.errors']);
    });

    it('strips _source from METADATA but keeps _id so v2 grouping can dedupe per document', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.createRule('rule-1', {
        ...createDefinition,
        esqlQuery:
          'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("message: error")',
      });

      const data = lastCreateCall(mock).data as {
        query: { format: 'standalone'; breach: { query: string } };
      };
      expect(data.query.breach.query).toBe(
        'FROM logs.child, logs.child.* METADATA _id | WHERE KQL("message: error") | LIMIT 1000'
      );
    });

    it('strips _source from updateRule queries while keeping _id', async () => {
      const mock = makeRulesClientMock();
      mock.updateRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.updateRule('rule-1', {
        ...updateDefinition,
        esqlQuery: 'FROM logs-* METADATA _id, _source | WHERE level == "error"',
      });

      const data = lastUpdateCall(mock).data as {
        query: { format: 'standalone'; breach: { query: string } };
      };
      expect(data.query.breach.query).toBe(
        'FROM logs-* METADATA _id | WHERE level == "error" | LIMIT 1000'
      );
    });

    it('appends MAX_ALERTS_PER_EXECUTION unconditionally — ES|QL min-semantics clamp larger author limits', async () => {
      // | LIMIT 500 | LIMIT 1000 → 500 (author wins, smaller limit)
      // | LIMIT 50000 | LIMIT 1000 → 1000 (capped)
      const mock = makeRulesClientMock();
      mock.createRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.createRule('rule-1', {
        ...createDefinition,
        esqlQuery: 'FROM logs-* METADATA _id, _source | WHERE level == "error" | LIMIT 500',
      });

      const data = lastCreateCall(mock).data as {
        query: { format: 'standalone'; breach: { query: string } };
      };
      expect(data.query.breach.query).toBe(
        'FROM logs-* METADATA _id | WHERE level == "error" | LIMIT 500 | LIMIT 1000'
      );
    });

    it('leaves queries without METADATA unchanged', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.createRule('rule-1', {
        ...createDefinition,
        esqlQuery: 'FROM logs-* | WHERE level == "error"',
      });

      const data = lastCreateCall(mock).data as {
        query: { format: 'standalone'; breach: { query: string } };
      };
      expect(data.query.breach.query).toBe('FROM logs-* | WHERE level == "error" | LIMIT 1000');
    });
  });

  describe('createRule', () => {
    it('falls back to updateRule on 409 conflict', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockRejectedValueOnce(Boom.conflict('exists'));
      mock.updateRule.mockResolvedValueOnce({} as never);
      const adapter = makeAdapter(mock);
      await adapter.createRule('rule-1', createDefinition);

      expect(mock.createRule).toHaveBeenCalledTimes(1);
      expect(mock.updateRule).toHaveBeenCalledTimes(1);
      expect(lastUpdateCall(mock).id).toBe('rule-1');
    });

    it('throws on non-409 errors', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockRejectedValueOnce(Boom.badRequest('invalid'));
      const adapter = makeAdapter(mock);
      await expect(adapter.createRule('rule-1', createDefinition)).rejects.toMatchObject({
        output: { statusCode: 400 },
      });
    });
  });

  describe('updateRule', () => {
    it('falls back to createRule on 404 not found', async () => {
      const mock = makeRulesClientMock();
      mock.updateRule.mockRejectedValueOnce(Boom.notFound('missing'));
      mock.createRule.mockResolvedValueOnce({} as never);
      const adapter = makeAdapter(mock);
      await adapter.updateRule('rule-1', updateDefinition);

      expect(mock.updateRule).toHaveBeenCalledTimes(1);
      expect(mock.createRule).toHaveBeenCalledTimes(1);
      expect(lastCreateCall(mock).options).toEqual({ id: 'rule-1' });
    });

    it('treats 409 during the fallback create as success (breaks the 404/409 cycle)', async () => {
      const mock = makeRulesClientMock();
      mock.updateRule.mockRejectedValueOnce(Boom.notFound('missing'));
      mock.createRule.mockRejectedValueOnce(Boom.conflict('race'));
      const adapter = makeAdapter(mock);
      await expect(adapter.updateRule('rule-1', updateDefinition)).resolves.toBeUndefined();

      expect(mock.createRule).toHaveBeenCalledTimes(1);
      expect(mock.updateRule).toHaveBeenCalledTimes(1);
    });

    it('throws on non-404 errors', async () => {
      const mock = makeRulesClientMock();
      mock.updateRule.mockRejectedValueOnce(Boom.forbidden('no'));
      const adapter = makeAdapter(mock);
      await expect(adapter.updateRule('rule-1', updateDefinition)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
    });
  });

  describe('bulkDeleteRules', () => {
    it('calls bulkDeleteRules with ids', async () => {
      const mock = makeRulesClientMock();
      mock.bulkDeleteRules.mockResolvedValue({ affected_count: 2, errors: [] });
      const adapter = makeAdapter(mock);
      await adapter.bulkDeleteRules(['id-1', 'id-2']);

      expect(mock.bulkDeleteRules).toHaveBeenCalledWith({ ids: ['id-1', 'id-2'] });
    });

    it('is a no-op for an empty array', async () => {
      const mock = makeRulesClientMock();
      const adapter = makeAdapter(mock);
      await adapter.bulkDeleteRules([]);

      expect(mock.bulkDeleteRules).not.toHaveBeenCalled();
    });

    it('treats per-rule RULE_NOT_FOUND errors as benign', async () => {
      const mock = makeRulesClientMock();
      mock.bulkDeleteRules.mockResolvedValue({
        affected_count: 0,
        errors: [
          {
            id: 'id-1',
            error: { code: ALERTING_V2_ERROR_CODES.RULE_NOT_FOUND, message: 'nope' },
          },
        ],
      });
      const adapter = makeAdapter(mock);
      await expect(adapter.bulkDeleteRules(['id-1'])).resolves.toBeUndefined();
    });

    it('throws when any error is not RULE_NOT_FOUND', async () => {
      const mock = makeRulesClientMock();
      mock.bulkDeleteRules.mockResolvedValue({
        affected_count: 0,
        errors: [
          {
            id: 'id-1',
            error: {
              code: ALERTING_V2_ERROR_CODES.INTERNAL_SERVER_ERROR,
              message: 'storage failure',
            },
          },
        ],
      });
      const adapter = makeAdapter(mock);
      await expect(adapter.bulkDeleteRules(['id-1'])).rejects.toThrow(
        'V2 bulk delete failed for 1 rule(s)'
      );
    });
  });

  describe('findOwnedRuleIds', () => {
    it('returns rule ids for the given stream filtered by structured tag', async () => {
      const mock = makeRulesClientMock();
      mock.findRules.mockResolvedValueOnce({
        items: [{ id: 'r-1' }, { id: 'r-2' }],
        total: 2,
        page: 1,
        perPage: 500,
      });
      const adapter = makeAdapter(mock);

      const ids = await adapter.findOwnedRuleIds('my-stream');

      expect(ids).toEqual(['r-1', 'r-2']);
      expect(mock.findRules).toHaveBeenCalledWith(
        expect.objectContaining({ filter: 'metadata.tags: "sigevents:stream:my-stream"' })
      );
    });

    it('pages through results until all ids are collected', async () => {
      const mock = makeRulesClientMock();
      mock.findRules
        .mockResolvedValueOnce({ items: [{ id: 'r-1' }], total: 2, page: 1, perPage: 500 })
        .mockResolvedValueOnce({ items: [{ id: 'r-2' }], total: 2, page: 2, perPage: 500 });
      const adapter = makeAdapter(mock);

      const ids = await adapter.findOwnedRuleIds('my-stream');

      expect(ids).toEqual(['r-1', 'r-2']);
      expect(mock.findRules).toHaveBeenCalledTimes(2);
    });

    it('stops when a page is empty even if the reported total is stale', async () => {
      const mock = makeRulesClientMock();
      mock.findRules
        .mockResolvedValueOnce({ items: [{ id: 'r-1' }], total: 2, page: 1, perPage: 500 })
        .mockResolvedValueOnce({ items: [], total: 2, page: 2, perPage: 500 });
      const adapter = makeAdapter(mock);

      const ids = await adapter.findOwnedRuleIds('my-stream');

      expect(ids).toEqual(['r-1']);
      expect(mock.findRules).toHaveBeenCalledTimes(2);
    });

    it('returns empty array when no rules exist', async () => {
      const mock = makeRulesClientMock();
      mock.findRules.mockResolvedValueOnce({ items: [], total: 0, page: 1, perPage: 500 });
      const adapter = makeAdapter(mock);

      const ids = await adapter.findOwnedRuleIds('my-stream');

      expect(ids).toEqual([]);
    });
  });
});
