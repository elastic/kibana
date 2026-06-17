/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { Logger } from '@kbn/core/server';
import type { Feature, QueryLink } from '@kbn/streams-schema';
import { QueryRuleOrchestrator } from './query_rule_orchestrator';
import type { IRulesManagementClient } from './rules/rules_management_client';
import type { IndicatorWriter } from './indicator_writer';
import type { IndicatorReader } from './indicator_reader';
import type { RuleUnbackedFilter } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRulesClient(): jest.Mocked<IRulesManagementClient> {
  return {
    createRule: jest.fn().mockResolvedValue(undefined),
    updateRule: jest.fn().mockResolvedValue(undefined),
    bulkDeleteRules: jest.fn().mockResolvedValue(undefined),
    findStreamsOwnedRules: jest.fn().mockResolvedValue([]),
  };
}

function makeWriter(): jest.Mocked<Pick<IndicatorWriter, 'bulk'>> {
  return { bulk: jest.fn().mockResolvedValue({ applied: 0, skipped: 0 }) };
}

/**
 * Build a reader mock that routes getQueryLinks by ruleUnbacked filter.
 * This mirrors the real call pattern: steps 1+2 use 'exclude', step 3 uses 'only'.
 * Callers override per-filter return values via `backedLinks` / `unbackedLinks`.
 */
function makeReader({
  backedLinks = [] as QueryLink[],
  unbackedLinks = [] as QueryLink[],
  features = [] as Feature[],
}: {
  backedLinks?: QueryLink[];
  unbackedLinks?: QueryLink[];
  features?: Feature[];
} = {}): jest.Mocked<Pick<IndicatorReader, 'getQueryLinks' | 'getFeatures'>> {
  return {
    getQueryLinks: jest
      .fn()
      .mockImplementation((_streams: string[], filters?: { ruleUnbacked?: RuleUnbackedFilter }) =>
        Promise.resolve(filters?.ruleUnbacked === 'only' ? unbackedLinks : backedLinks)
      ),
    getFeatures: jest.fn().mockResolvedValue({ hits: features }),
  };
}

function makeQueryLink(overrides: Partial<QueryLink> = {}): QueryLink {
  return {
    stream_name: 'logs-app',
    rule_backed: true,
    rule_id: 'rule-1',
    expires_at: '2099-01-01T00:00:00.000Z',
    query: {
      id: 'q-1',
      title: 'Error query',
      description: 'desc',
      type: 'match',
      esql: { query: 'FROM logs-* | LIMIT 1' },
      features: [{ id: 'feat-1' }],
    },
    ...overrides,
  };
}

function makeFeature(id: string, streamName = 'logs-app'): Feature {
  return {
    id,
    stream_name: streamName,
    type: 'inferred',
    name: id,
    description: '',
    confidence: 1,
    updated_at: '2024-01-01T00:00:00.000Z',
  } as unknown as Feature;
}

function makeOrchestrator({
  rulesClient = makeRulesClient(),
  writer = makeWriter(),
  reader = makeReader(),
  isEnabled = true,
  logger = loggerMock.create() as unknown as Logger,
}: {
  rulesClient?: jest.Mocked<IRulesManagementClient>;
  writer?: jest.Mocked<Pick<IndicatorWriter, 'bulk'>>;
  reader?: jest.Mocked<Pick<IndicatorReader, 'getQueryLinks' | 'getFeatures'>>;
  isEnabled?: boolean;
  logger?: Logger;
} = {}) {
  return new QueryRuleOrchestrator(
    rulesClient,
    logger,
    isEnabled,
    writer as unknown as IndicatorWriter,
    reader as unknown as IndicatorReader
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QueryRuleOrchestrator.syncGroundedness', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty summary when significant events is disabled', async () => {
    const rulesClient = makeRulesClient();
    const orchestrator = makeOrchestrator({ rulesClient, isEnabled: false });

    const summary = await orchestrator.syncGroundedness(['logs-app']);

    expect(summary).toEqual({ tombstonedQueries: 0, sweptRules: 0, errors: [] });
    expect(rulesClient.findStreamsOwnedRules).not.toHaveBeenCalled();
  });

  it('is a no-op when there are no rules and no query links', async () => {
    const summary = await makeOrchestrator().syncGroundedness();
    expect(summary).toEqual({ tombstonedQueries: 0, sweptRules: 0, errors: [] });
  });

  // -------------------------------------------------------------------------
  // Step 1: rule-backed queries
  // -------------------------------------------------------------------------
  describe('step 1 — rule-backed queries', () => {
    it('deletes an orphaned rule that has no backing KI query', async () => {
      const rulesClient = makeRulesClient();
      rulesClient.findStreamsOwnedRules.mockResolvedValue([
        { id: 'orphan-rule', streamName: 'logs-app' },
      ]);
      // No backed query links → rule is orphaned
      const reader = makeReader({ backedLinks: [] });
      const orchestrator = makeOrchestrator({ rulesClient, reader });

      const summary = await orchestrator.syncGroundedness();

      expect(rulesClient.bulkDeleteRules).toHaveBeenCalledWith(['orphan-rule']);
      expect(summary.sweptRules).toBe(1);
      expect(summary.tombstonedQueries).toBe(0);
    });

    it('does not delete a rule whose backing query is grounded', async () => {
      const rulesClient = makeRulesClient();
      rulesClient.findStreamsOwnedRules.mockResolvedValue([
        { id: 'rule-1', streamName: 'logs-app' },
      ]);
      const link = makeQueryLink({ rule_id: 'rule-1' });
      const reader = makeReader({
        backedLinks: [link],
        features: [makeFeature('feat-1')], // feat-1 is alive
      });
      const orchestrator = makeOrchestrator({ rulesClient, reader });

      const summary = await orchestrator.syncGroundedness();

      expect(rulesClient.bulkDeleteRules).not.toHaveBeenCalled();
      expect(summary.sweptRules).toBe(0);
    });

    it('deletes the rule and tombstones the query when the backing query is ungrounded', async () => {
      const rulesClient = makeRulesClient();
      const writer = makeWriter();
      rulesClient.findStreamsOwnedRules.mockResolvedValue([
        { id: 'rule-1', streamName: 'logs-app' },
      ]);
      const link = makeQueryLink({
        rule_id: 'rule-1',
        query: { ...makeQueryLink().query, features: [{ id: 'feat-gone' }] },
      });
      const reader = makeReader({
        backedLinks: [link],
        features: [], // feat-gone absent
      });
      const orchestrator = makeOrchestrator({ rulesClient, writer, reader });

      const summary = await orchestrator.syncGroundedness();

      expect(rulesClient.bulkDeleteRules).toHaveBeenCalledWith(['rule-1']);
      expect(writer.bulk).toHaveBeenCalledWith(
        'logs-app',
        expect.arrayContaining([{ delete: { type: 'query', id: link.query.id } }])
      );
      expect(summary.sweptRules).toBe(1);
      expect(summary.tombstonedQueries).toBe(1);
    });

    it('leaves durable rule-backed queries (null expires_at) untouched even when features are gone', async () => {
      const rulesClient = makeRulesClient();
      const writer = makeWriter();
      rulesClient.findStreamsOwnedRules.mockResolvedValue([
        { id: 'rule-1', streamName: 'logs-app' },
      ]);
      const link = makeQueryLink({ rule_id: 'rule-1', expires_at: undefined });
      const reader = makeReader({ backedLinks: [link], features: [] });
      const orchestrator = makeOrchestrator({ rulesClient, writer, reader });

      const summary = await orchestrator.syncGroundedness();

      expect(writer.bulk).not.toHaveBeenCalled();
      expect(rulesClient.bulkDeleteRules).not.toHaveBeenCalled();
      expect(summary.tombstonedQueries).toBe(0);
    });

    it('collects per-stream errors without aborting', async () => {
      const rulesClient = makeRulesClient();
      rulesClient.findStreamsOwnedRules.mockResolvedValue([
        { id: 'rule-1', streamName: 'logs-app' },
      ]);
      // Only reject per-stream calls (non-empty stream array); steps 2+3 pass [] and succeed.
      const reader: jest.Mocked<Pick<IndicatorReader, 'getQueryLinks' | 'getFeatures'>> = {
        getQueryLinks: jest
          .fn()
          .mockImplementation((streams: string[]) =>
            streams.length > 0 ? Promise.reject(new Error('ES unavailable')) : Promise.resolve([])
          ),
        getFeatures: jest.fn().mockResolvedValue({ hits: [] }),
      };
      const orchestrator = makeOrchestrator({ rulesClient, reader });

      const summary = await orchestrator.syncGroundedness();

      expect(summary.errors).toHaveLength(1);
      expect(summary.errors[0]).toMatchObject({ stream: 'logs-app', error: 'ES unavailable' });
    });

    it('scopes to provided streamNames', async () => {
      const rulesClient = makeRulesClient();
      rulesClient.findStreamsOwnedRules.mockResolvedValue([
        { id: 'rule-app', streamName: 'logs-app' },
        { id: 'rule-other', streamName: 'logs-other' },
      ]);
      const reader = makeReader({ backedLinks: [] });
      const orchestrator = makeOrchestrator({ rulesClient, reader });

      await orchestrator.syncGroundedness(['logs-app']);

      // Only logs-app processed in step 1; logs-other filtered out
      expect(reader.getQueryLinks).not.toHaveBeenCalledWith(['logs-other'], expect.anything());
    });
  });

  // -------------------------------------------------------------------------
  // Step 2: rule-backed queries with deleted rules
  // -------------------------------------------------------------------------
  describe('step 2 — rule-backed queries with deleted rules', () => {
    it('tombstones a rule-backed query whose rule was deleted out of band', async () => {
      const writer = makeWriter();
      // No rules in alerting framework (deleted out of band)
      const rulesClient = makeRulesClient();
      rulesClient.findStreamsOwnedRules.mockResolvedValue([]);
      // KI data stream still has a rule-backed query link for 'deleted-rule'
      const staleLink = makeQueryLink({ rule_id: 'deleted-rule', rule_backed: true });
      const reader = makeReader({ backedLinks: [staleLink] });
      const orchestrator = makeOrchestrator({ rulesClient, writer, reader });

      const summary = await orchestrator.syncGroundedness();

      // liveRuleIds is empty (no rules enumerated); staleLink.rule_id not in set → tombstoned
      expect(writer.bulk).toHaveBeenCalledWith(
        'logs-app',
        expect.arrayContaining([{ delete: { type: 'query', id: staleLink.query.id } }])
      );
      expect(summary.tombstonedQueries).toBe(1);
    });

    it('does not tombstone a query whose rule is still live', async () => {
      const writer = makeWriter();
      const rulesClient = makeRulesClient();
      rulesClient.findStreamsOwnedRules.mockResolvedValue([
        { id: 'rule-1', streamName: 'logs-app' },
      ]);
      const link = makeQueryLink({ rule_id: 'rule-1' });
      const reader = makeReader({
        backedLinks: [link],
        features: [makeFeature('feat-1')],
      });
      const orchestrator = makeOrchestrator({ rulesClient, writer, reader });

      const summary = await orchestrator.syncGroundedness();

      // rule-1 is in liveRuleIds → step 2 finds no stale links
      expect(summary.tombstonedQueries).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Step 3: unbacked queries
  // -------------------------------------------------------------------------
  describe('step 3 — unbacked queries', () => {
    it('tombstones an ungrounded unbacked query', async () => {
      const writer = makeWriter();
      const link = makeQueryLink({
        rule_backed: false,
        rule_id: undefined,
        query: { ...makeQueryLink().query, features: [{ id: 'feat-gone' }] },
      });
      const reader = makeReader({
        backedLinks: [],
        unbackedLinks: [link],
        features: [], // feat-gone absent
      });
      const orchestrator = makeOrchestrator({ writer, reader });

      const summary = await orchestrator.syncGroundedness();

      expect(writer.bulk).toHaveBeenCalledWith(
        'logs-app',
        expect.arrayContaining([{ delete: { type: 'query', id: link.query.id } }])
      );
      expect(summary.tombstonedQueries).toBe(1);
    });

    it('leaves grounded unbacked queries untouched', async () => {
      const writer = makeWriter();
      const link = makeQueryLink({
        rule_backed: false,
        rule_id: undefined,
        query: { ...makeQueryLink().query, features: [{ id: 'feat-alive' }] },
      });
      const reader = makeReader({
        unbackedLinks: [link],
        features: [makeFeature('feat-alive')],
      });
      const orchestrator = makeOrchestrator({ writer, reader });

      const summary = await orchestrator.syncGroundedness();

      expect(writer.bulk).not.toHaveBeenCalled();
      expect(summary.tombstonedQueries).toBe(0);
    });

    it('leaves durable unbacked queries (null expires_at) untouched', async () => {
      const writer = makeWriter();
      const link = makeQueryLink({
        rule_backed: false,
        rule_id: undefined,
        expires_at: undefined,
        query: { ...makeQueryLink().query, features: [{ id: 'feat-gone' }] },
      });
      const reader = makeReader({ unbackedLinks: [link], features: [] });
      const orchestrator = makeOrchestrator({ writer, reader });

      await orchestrator.syncGroundedness();

      expect(writer.bulk).not.toHaveBeenCalled();
    });
  });
});
