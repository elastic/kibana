/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { Logger } from '@kbn/core/server';
import type { Streams } from '@kbn/streams-schema';
import type { Feature, QueryLink, StreamQuery } from '@kbn/significant-events-schema';
import type { IRulesManagementClient } from './rules/rules_management_client';
import type { IndicatorReader } from './indicator_reader';
import type { IndicatorWriter } from './indicator_writer';
import { QueryRuleOrchestrator } from './query_rule_orchestrator';

const STREAM = 'logs.test';
const definition = { name: STREAM } as Streams.all.Definition;

const makeQuery = (
  overrides: Partial<StreamQuery> & { id?: string; severity_score?: number } = {}
): StreamQuery => ({
  id: overrides.id ?? 'q1',
  type: 'match',
  title: overrides.title ?? 'Test query',
  description: 'desc',
  esql: { query: overrides.esql?.query ?? 'FROM logs | WHERE body.text:"error"' },
  severity_score: overrides.severity_score ?? 30,
  ...overrides,
});

const makeLink = (
  overrides: Partial<StreamQuery> & { id?: string; ruleBacked?: boolean } = {}
): QueryLink => ({
  query: makeQuery(overrides),
  stream_name: STREAM,
  rule_backed: overrides.ruleBacked ?? false,
  rule_id: `rule-${overrides.id ?? 'q1'}`,
});

function createOrchestrator({
  currentLinks = [] as QueryLink[],
}: {
  currentLinks?: QueryLink[];
} = {}) {
  const rulesManagementClient = {
    createRule: jest.fn().mockResolvedValue(undefined),
    updateRule: jest.fn().mockResolvedValue(undefined),
    bulkDeleteRules: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IRulesManagementClient>;

  const writer = {
    bulk: jest.fn().mockResolvedValue({ applied: 1, skipped: 0 }),
  } as unknown as jest.Mocked<IndicatorWriter>;

  const reader = {
    getStreamToQueryLinksMap: jest.fn().mockResolvedValue({ [STREAM]: currentLinks }),
  } as unknown as jest.Mocked<IndicatorReader>;

  const orchestrator = new QueryRuleOrchestrator(
    rulesManagementClient,
    loggerMock.create(),
    true,
    writer,
    reader
  );

  return { orchestrator, rulesManagementClient, writer, reader };
}

describe('QueryRuleOrchestrator', () => {
  describe('syncQueries', () => {
    it('creates rules for new high-severity MATCH queries', async () => {
      const { orchestrator, rulesManagementClient } = createOrchestrator();
      const newQuery = makeQuery({
        id: 'new-high',
        severity_score: 80,
        esql: { query: 'FROM logs | WHERE body.text:"critical"' },
      });

      await orchestrator.syncQueries(definition, [newQuery]);

      expect(rulesManagementClient.createRule).toHaveBeenCalledTimes(1);
    });

    it('does not promote existing unbacked low-severity MATCH queries when syncing a new high-severity query', async () => {
      const existingLow = makeLink({
        id: 'low-sev',
        severity_score: 25,
        esql: { query: 'FROM logs | WHERE body.text:"startup"' },
        ruleBacked: false,
      });
      const { orchestrator, rulesManagementClient, writer } = createOrchestrator({
        currentLinks: [existingLow],
      });
      const newHigh = makeQuery({
        id: 'high-sev',
        title: 'OOM errors',
        severity_score: 80,
        esql: { query: 'FROM logs | WHERE body.text:"oom"' },
      });

      await orchestrator.syncQueries(definition, [existingLow.query, newHigh], {
        currentLinks: [existingLow],
      });

      expect(rulesManagementClient.createRule).toHaveBeenCalledTimes(1);
      expect(rulesManagementClient.createRule).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ name: 'OOM errors' })
      );

      const bulkOps = (writer.bulk as jest.Mock).mock.calls[0][1];
      const lowSevOp = bulkOps.find(
        (op: { index?: { query?: { id?: string } } }) => op.index?.query?.id === 'low-sev'
      );
      expect(lowSevOp?.index?.query?.rule_backed).toBe(false);
    });

    it('promotes existing unbacked queries only via promoteQueries', async () => {
      const existingLow = makeLink({
        id: 'low-sev',
        severity_score: 25,
        ruleBacked: false,
      });
      const { orchestrator, rulesManagementClient, writer } = createOrchestrator({
        currentLinks: [existingLow],
      });

      await orchestrator.promoteQueries(definition, ['low-sev']);

      expect(rulesManagementClient.createRule).toHaveBeenCalledTimes(1);
      const bulkOps = (writer.bulk as jest.Mock).mock.calls[0][1];
      expect(bulkOps[0].index.query.rule_backed).toBe(true);
    });
  });

  describe('demoteQueries', () => {
    it('reads with includeExpired so an already-expired query stays demotable', async () => {
      const expiredBacked = makeLink({ id: 'expired-1', ruleBacked: true });
      const { orchestrator, reader, rulesManagementClient, writer } = createOrchestrator({
        currentLinks: [expiredBacked],
      });

      const result = await orchestrator.demoteQueries(definition, ['expired-1']);

      expect(reader.getStreamToQueryLinksMap).toHaveBeenCalledWith(
        [STREAM],
        expect.objectContaining({ includeExpired: true })
      );
      expect(rulesManagementClient.bulkDeleteRules).toHaveBeenCalledWith(['rule-expired-1']);
      expect(writer.bulk).toHaveBeenCalled();
      expect(result.demoted).toBe(1);
    });
  });

  describe('reconcileStream', () => {
    function makeReconcileLink(overrides: Partial<QueryLink> = {}): QueryLink {
      return {
        stream_name: STREAM,
        rule_backed: true,
        rule_id: 'rule-1',
        expires_at: '2020-01-01T00:00:00.000Z',
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

    function makeFeature(id: string): Feature {
      return {
        id,
        stream_name: STREAM,
        type: 'entity',
        description: '',
        properties: {},
        confidence: 100,
      } as unknown as Feature;
    }

    function makeReconcileReader({
      links = [] as QueryLink[],
      features = [] as Feature[],
    }: { links?: QueryLink[]; features?: Feature[] } = {}) {
      return {
        getQueryLinks: jest.fn().mockResolvedValue(links),
        getFeatures: jest.fn().mockResolvedValue({ hits: features }),
      } as unknown as jest.Mocked<IndicatorReader>;
    }

    function makeReconcileRulesClient(): jest.Mocked<IRulesManagementClient> {
      return {
        createRule: jest.fn().mockResolvedValue(undefined),
        updateRule: jest.fn().mockResolvedValue(undefined),
        bulkDeleteRules: jest.fn().mockResolvedValue(undefined),
        findOwnedRuleIds: jest.fn().mockResolvedValue([]),
      };
    }

    function makeReconcileOrchestrator({
      rulesClient = makeReconcileRulesClient(),
      writer = {
        bulk: jest.fn().mockResolvedValue({ applied: 0, skipped: 0 }),
      } as unknown as jest.Mocked<IndicatorWriter>,
      reader = makeReconcileReader(),
      isEnabled = true,
      logger = loggerMock.create(),
    }: {
      rulesClient?: jest.Mocked<IRulesManagementClient>;
      writer?: jest.Mocked<IndicatorWriter>;
      reader?: jest.Mocked<IndicatorReader>;
      isEnabled?: boolean;
      logger?: Logger;
    } = {}) {
      return new QueryRuleOrchestrator(rulesClient, logger, isEnabled, writer, reader);
    }

    it('returns zeroed summary when significant events is disabled', async () => {
      const rulesClient = makeReconcileRulesClient();
      const orchestrator = makeReconcileOrchestrator({ rulesClient, isEnabled: false });

      const summary = await orchestrator.reconcileStream(definition);

      expect(summary).toEqual({ tombstoned: 0, orphanRulesDeleted: 0 });
      expect(rulesClient.findOwnedRuleIds).not.toHaveBeenCalled();
    });

    it('is a no-op when there are no links, rules, or features', async () => {
      const summary = await makeReconcileOrchestrator().reconcileStream(definition);
      expect(summary).toEqual({ tombstoned: 0, orphanRulesDeleted: 0 });
    });

    it('tombstones an ungrounded rule-backed query and uninstalls its rule', async () => {
      const rulesClient = makeReconcileRulesClient();
      const writer = {
        bulk: jest.fn().mockResolvedValue({ applied: 1, skipped: 0 }),
      } as unknown as jest.Mocked<IndicatorWriter>;
      rulesClient.findOwnedRuleIds.mockResolvedValue(['rule-1']);
      const link = makeReconcileLink();
      const reader = makeReconcileReader({ links: [link], features: [] }); // feat-1 gone
      const orchestrator = makeReconcileOrchestrator({ rulesClient, writer, reader });

      const summary = await orchestrator.reconcileStream(definition);

      expect(rulesClient.bulkDeleteRules).toHaveBeenCalledWith(['rule-1']);
      expect(writer.bulk).toHaveBeenCalledWith(
        STREAM,
        expect.arrayContaining([{ delete: { type: 'query', id: 'q-1' } }])
      );
      expect(summary.tombstoned).toBe(1);
    });

    it('leaves grounded rule-backed queries untouched', async () => {
      const rulesClient = makeReconcileRulesClient();
      const writer = {
        bulk: jest.fn().mockResolvedValue({ applied: 0, skipped: 0 }),
      } as unknown as jest.Mocked<IndicatorWriter>;
      rulesClient.findOwnedRuleIds.mockResolvedValue(['rule-1']);
      const link = makeReconcileLink({ expires_at: '2099-01-01T00:00:00.000Z' });
      const reader = makeReconcileReader({ links: [link], features: [makeFeature('feat-1')] });
      const orchestrator = makeReconcileOrchestrator({ rulesClient, writer, reader });

      const summary = await orchestrator.reconcileStream(definition);

      expect(writer.bulk).not.toHaveBeenCalled();
      expect(rulesClient.bulkDeleteRules).not.toHaveBeenCalled();
      expect(summary.tombstoned).toBe(0);
    });

    it('tombstones an expired, featureless, otherwise-grounded query and uninstalls its rule', async () => {
      const rulesClient = makeReconcileRulesClient();
      const writer = {
        bulk: jest.fn().mockResolvedValue({ applied: 1, skipped: 0 }),
      } as unknown as jest.Mocked<IndicatorWriter>;
      rulesClient.findOwnedRuleIds.mockResolvedValue(['rule-1']);
      const link = makeReconcileLink({
        expires_at: '2020-01-01T00:00:00.000Z',
        query: { ...makeReconcileLink().query, features: [] },
      });
      const reader = makeReconcileReader({ links: [link], features: [] });
      const orchestrator = makeReconcileOrchestrator({ rulesClient, writer, reader });

      const summary = await orchestrator.reconcileStream(definition);

      expect(rulesClient.bulkDeleteRules).toHaveBeenCalledWith(['rule-1']);
      expect(writer.bulk).toHaveBeenCalledWith(
        STREAM,
        expect.arrayContaining([{ delete: { type: 'query', id: 'q-1' } }])
      );
      expect(summary.tombstoned).toBe(1);
    });

    it('leaves durable queries (null expires_at) untouched even when features are gone', async () => {
      const rulesClient = makeReconcileRulesClient();
      const writer = {
        bulk: jest.fn().mockResolvedValue({ applied: 0, skipped: 0 }),
      } as unknown as jest.Mocked<IndicatorWriter>;
      rulesClient.findOwnedRuleIds.mockResolvedValue(['rule-1']);
      const link = makeReconcileLink({ expires_at: undefined });
      const reader = makeReconcileReader({ links: [link], features: [] });
      const orchestrator = makeReconcileOrchestrator({ rulesClient, writer, reader });

      const summary = await orchestrator.reconcileStream(definition);

      expect(writer.bulk).not.toHaveBeenCalled();
      expect(summary.tombstoned).toBe(0);
    });

    it('requests query links with includeExpired so expired links stay visible to reconciliation', async () => {
      const reader = makeReconcileReader();
      const orchestrator = makeReconcileOrchestrator({ reader });

      await orchestrator.reconcileStream(definition);

      expect(reader.getQueryLinks).toHaveBeenCalledWith(
        [STREAM],
        expect.objectContaining({ includeExpired: true })
      );
    });

    it('tombstones an ungrounded unbacked query with no alerting rule', async () => {
      const writer = {
        bulk: jest.fn().mockResolvedValue({ applied: 1, skipped: 0 }),
      } as unknown as jest.Mocked<IndicatorWriter>;
      const link = makeReconcileLink({
        rule_backed: false,
        rule_id: undefined,
        query: { ...makeReconcileLink().query, features: [{ id: 'feat-gone' }] },
      });
      const reader = makeReconcileReader({ links: [link], features: [] });
      const orchestrator = makeReconcileOrchestrator({ writer, reader });

      const summary = await orchestrator.reconcileStream(definition);

      expect(writer.bulk).toHaveBeenCalledWith(
        STREAM,
        expect.arrayContaining([{ delete: { type: 'query', id: 'q-1' } }])
      );
      expect(summary.tombstoned).toBe(1);
    });

    it('deletes an orphan rule with no backing KI query', async () => {
      const rulesClient = makeReconcileRulesClient();
      rulesClient.findOwnedRuleIds.mockResolvedValue(['orphan-rule']);
      const reader = makeReconcileReader({ links: [] });
      const orchestrator = makeReconcileOrchestrator({ rulesClient, reader });

      const summary = await orchestrator.reconcileStream(definition);

      expect(rulesClient.bulkDeleteRules).toHaveBeenCalledWith(['orphan-rule']);
      expect(summary.orphanRulesDeleted).toBe(1);
    });

    it('tombstones a rule-backed query whose rule was deleted out of band (seam)', async () => {
      const rulesClient = makeReconcileRulesClient();
      const writer = {
        bulk: jest.fn().mockResolvedValue({ applied: 1, skipped: 0 }),
      } as unknown as jest.Mocked<IndicatorWriter>;
      // The rule for 'rule-1' no longer exists in the alerting framework.
      rulesClient.findOwnedRuleIds.mockResolvedValue([]);
      const link = makeReconcileLink({ expires_at: undefined }); // durable, so grounding never applies
      const reader = makeReconcileReader({ links: [link], features: [makeFeature('feat-1')] });
      const orchestrator = makeReconcileOrchestrator({ rulesClient, writer, reader });

      const summary = await orchestrator.reconcileStream(definition);

      // No live rule to enumerate as an orphan; the seam tombstones the query instead.
      expect(writer.bulk).toHaveBeenCalledWith(
        STREAM,
        expect.arrayContaining([{ delete: { type: 'query', id: 'q-1' } }])
      );
      expect(summary.tombstoned).toBe(1);
      expect(summary.orphanRulesDeleted).toBe(0);
    });

    it('does not tombstone via the seam when the rule is still live', async () => {
      const rulesClient = makeReconcileRulesClient();
      const writer = {
        bulk: jest.fn().mockResolvedValue({ applied: 0, skipped: 0 }),
      } as unknown as jest.Mocked<IndicatorWriter>;
      rulesClient.findOwnedRuleIds.mockResolvedValue(['rule-1']);
      const link = makeReconcileLink({ expires_at: undefined });
      const reader = makeReconcileReader({ links: [link], features: [makeFeature('feat-1')] });
      const orchestrator = makeReconcileOrchestrator({ rulesClient, writer, reader });

      const summary = await orchestrator.reconcileStream(definition);

      expect(writer.bulk).not.toHaveBeenCalled();
      expect(summary.tombstoned).toBe(0);
    });

    it('counts a query only once when it is both ungrounded and seam-eligible', async () => {
      const rulesClient = makeReconcileRulesClient();
      const writer = {
        bulk: jest.fn().mockResolvedValue({ applied: 1, skipped: 0 }),
      } as unknown as jest.Mocked<IndicatorWriter>;
      // Expired (ground-truth candidate) and its rule isn't owned (seam candidate too).
      rulesClient.findOwnedRuleIds.mockResolvedValue([]);
      const link = makeReconcileLink({ expires_at: '2020-01-01T00:00:00.000Z' });
      const reader = makeReconcileReader({ links: [link], features: [makeFeature('feat-1')] });
      const orchestrator = makeReconcileOrchestrator({ rulesClient, writer, reader });

      const summary = await orchestrator.reconcileStream(definition);

      expect(writer.bulk).toHaveBeenCalledTimes(1);
      expect(writer.bulk).toHaveBeenCalledWith(STREAM, [{ delete: { type: 'query', id: 'q-1' } }]);
      expect(summary.tombstoned).toBe(1);
    });
  });
});
