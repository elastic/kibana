/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { QueryLink } from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient, KIBulkOperation } from '../knowledge_indicator_client';
import {
  buildQueryReconcilePlan,
  computeClusters,
  esqlStructuralSignature,
  pickCanonical,
  reconcileCodeAndLogQueries,
  RECONCILE_MIN_SCORE,
  toReconcileOperations,
} from './reconcile_query_kis';

const link = (overrides: {
  id: string;
  ruleBacked?: boolean;
  severity?: number;
  evidence?: string[];
  title?: string;
  updatedAt?: string;
  esql?: string;
}): QueryLink => ({
  stream_name: 'logs.checkout',
  rule_backed: overrides.ruleBacked ?? false,
  rule_id: `rule-${overrides.id}`,
  updated_at: overrides.updatedAt,
  query: {
    id: overrides.id,
    type: 'match',
    title: overrides.title ?? overrides.id,
    description: `desc ${overrides.id}`,
    esql: { query: overrides.esql ?? `FROM logs.checkout | WHERE x == "${overrides.id}"` },
    severity_score: overrides.severity,
    evidence: overrides.evidence,
  },
});

const adjacencyOf = (pairs: Array<[string, string]>): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  for (const [a, b] of pairs) {
    add(a, b);
    add(b, a);
  }
  return map;
};

describe('esqlStructuralSignature', () => {
  it('is equal for the same fields with different literal values and spacing', () => {
    expect(esqlStructuralSignature('FROM logs.a | WHERE msg == "x"')).toEqual(
      esqlStructuralSignature('FROM  logs.a\n| WHERE msg  ==  "y"')
    );
  });

  it('is equal across MATCH vs MATCH_PHRASE phrasings of the same field', () => {
    expect(esqlStructuralSignature('FROM logs.a | WHERE MATCH(message, "boom")')).toEqual(
      esqlStructuralSignature('FROM logs.a | WHERE MATCH_PHRASE(message, "kapow")')
    );
  });

  it('differs when the WHERE fields differ', () => {
    expect(esqlStructuralSignature('FROM traces | WHERE status.code == "Error"')).not.toEqual(
      esqlStructuralSignature('FROM traces | WHERE exception.type IS NOT NULL')
    );
  });

  it('differs when the FROM sources differ', () => {
    expect(esqlStructuralSignature('FROM logs.a | WHERE msg == "x"')).not.toEqual(
      esqlStructuralSignature('FROM logs.b | WHERE msg == "x"')
    );
  });

  it('includes STATS BY grouping fields in the signature', () => {
    expect(
      esqlStructuralSignature(
        'FROM traces | WHERE status.code == "Error" | STATS c = COUNT(*) BY name'
      )
    ).not.toEqual(esqlStructuralSignature('FROM traces | WHERE status.code == "Error"'));
  });
});

describe('computeClusters', () => {
  it('groups connected ids and isolates singletons', () => {
    const clusters = computeClusters(['a', 'b', 'c', 'd'], adjacencyOf([['a', 'b']]));
    const sorted = clusters.map((c) => c.sort()).sort((x, y) => x[0].localeCompare(y[0]));
    expect(sorted).toEqual([['a', 'b'], ['c'], ['d']]);
  });
});

describe('pickCanonical', () => {
  it('prefers a rule-backed query', () => {
    const canonical = pickCanonical([
      link({ id: 'draft', severity: 90 }),
      link({ id: 'ruled', ruleBacked: true, severity: 10 }),
    ]);
    expect(canonical.query.id).toBe('ruled');
  });

  it('falls back to highest severity, then id', () => {
    const canonical = pickCanonical([
      link({ id: 'low', severity: 30 }),
      link({ id: 'high', severity: 80 }),
    ]);
    expect(canonical.query.id).toBe('high');
  });
});

describe('buildQueryReconcilePlan', () => {
  it('merges a code+log cluster into one canonical carrying both evidences', () => {
    const links = [
      link({ id: 'code1', severity: 70, evidence: ['code: acme/checkout main.go error("boom")'] }),
      link({ id: 'log1', severity: 60, evidence: ['logs: observed pattern boom'] }),
    ];
    const plan = buildQueryReconcilePlan(links, adjacencyOf([['code1', 'log1']]));
    expect(plan.merges).toHaveLength(1);
    const [merge] = plan.merges;
    expect(merge.canonical.query.id).toBe('code1'); // higher severity
    expect(merge.duplicateIds).toEqual(['log1']);
    expect(merge.mergedEvidence).toEqual(
      expect.arrayContaining([
        'code: acme/checkout main.go error("boom")',
        'logs: observed pattern boom',
      ])
    );
    expect(merge.mergedSeverity).toBe(70);
    expect(merge.corroborated).toBe(true);
  });

  it('skips clusters with more than one rule-backed query', () => {
    const links = [link({ id: 'r1', ruleBacked: true }), link({ id: 'r2', ruleBacked: true })];
    const plan = buildQueryReconcilePlan(links, adjacencyOf([['r1', 'r2']]), loggerMock.create());
    expect(plan.merges).toHaveLength(0);
  });

  it('ignores singleton clusters', () => {
    const links = [link({ id: 'solo', evidence: ['code: x'] })];
    expect(buildQueryReconcilePlan(links, new Map()).merges).toHaveLength(0);
  });
});

describe('toReconcileOperations', () => {
  it('emits a canonical re-index and a tombstone per duplicate', () => {
    const links = [
      link({ id: 'code1', severity: 70, evidence: ['code: a'] }),
      link({ id: 'log1', severity: 60, evidence: ['logs: b'] }),
    ];
    const plan = buildQueryReconcilePlan(links, adjacencyOf([['code1', 'log1']]));
    const ops = toReconcileOperations(plan);
    expect(ops).toHaveLength(2);
    expect(ops[0]).toHaveProperty('index.query.id', 'code1');
    expect(ops[1]).toEqual({ delete: { type: 'query', id: 'log1' } });
  });
});

describe('reconcileCodeAndLogQueries', () => {
  const createKiClient = (links: QueryLink[], neighbors: Record<string, QueryLink[]>) => {
    const bulk = jest.fn<
      Promise<{ applied: number; skipped: number }>,
      [string, KIBulkOperation[]]
    >(async () => ({ applied: 0, skipped: 0 }));
    const kiClient = {
      getStreamToQueryLinksMap: jest.fn(async () => ({ 'logs.checkout': links })),
      findQueries: jest.fn(async (_streams: unknown, text: string) => {
        const owner = links.find((l) => text.startsWith(l.query.title));
        return owner ? neighbors[owner.query.id] ?? [] : [];
      }),
      bulk,
    } as unknown as KnowledgeIndicatorClient;
    return { kiClient, bulk };
  };

  it('no-ops when fewer than two queries exist', async () => {
    const { kiClient, bulk } = createKiClient([link({ id: 'only', title: 'only' })], {});
    const result = await reconcileCodeAndLogQueries({
      streamName: 'logs.checkout',
      kiClient,
      logger: loggerMock.create(),
    });
    expect(result.clustersMerged).toBe(0);
    expect(bulk).not.toHaveBeenCalled();
  });

  it('merges mutually-similar code and log queries', async () => {
    const codeLink = link({
      id: 'code1',
      title: 'Payment failed for order',
      severity: 70,
      evidence: ['code: acme/checkout pay.go error'],
    });
    const logLink = link({
      id: 'log1',
      title: 'Payment failure detected',
      severity: 60,
      evidence: ['logs: observed payment failure'],
    });
    const { kiClient, bulk } = createKiClient([codeLink, logLink], {
      code1: [logLink],
      log1: [codeLink],
    });

    const result = await reconcileCodeAndLogQueries({
      streamName: 'logs.checkout',
      kiClient,
      logger: loggerMock.create(),
    });

    expect(result).toEqual({ clustersMerged: 1, queriesTombstoned: 1, corroborated: 1 });
    expect(bulk).toHaveBeenCalledTimes(1);
    const ops = bulk.mock.calls[0][1];
    expect(ops).toContainEqual({ delete: { type: 'query', id: 'log1' } });
  });

  it('does not merge one-directional (non-mutual) matches', async () => {
    const a = link({ id: 'a', title: 'alpha', severity: 50 });
    const b = link({ id: 'b', title: 'beta', severity: 50 });
    // a retrieves b, but b does not retrieve a -> no mutual edge.
    const { kiClient, bulk } = createKiClient([a, b], { a: [b], b: [] });
    const result = await reconcileCodeAndLogQueries({
      streamName: 'logs.checkout',
      kiClient,
      logger: loggerMock.create(),
    });
    expect(result.clustersMerged).toBe(0);
    expect(bulk).not.toHaveBeenCalled();
  });

  it('does not merge mutual semantic matches with different ES|QL structure', async () => {
    // Near-identical titles, but structurally distinct queries: different
    // fields mean different indicators — must NOT be tombstoned.
    const errorRate = link({
      id: 'err',
      title: 'Payment: error rate',
      esql: 'FROM traces | WHERE status.code == "Error" | STATS c = COUNT(*) BY name',
    });
    const exceptions = link({
      id: 'exc',
      title: 'Payment: errors by exception',
      esql: 'FROM traces | WHERE exception.type IS NOT NULL | STATS c = COUNT(*) BY exception.type',
    });
    const { kiClient, bulk } = createKiClient([errorRate, exceptions], {
      err: [exceptions],
      exc: [errorRate],
    });
    const result = await reconcileCodeAndLogQueries({
      streamName: 'logs.checkout',
      kiClient,
      logger: loggerMock.create(),
    });
    expect(result.clustersMerged).toBe(0);
    expect(bulk).not.toHaveBeenCalled();
  });

  it('applies the stricter reconcile score floor to semantic search', async () => {
    const a = link({ id: 'a', title: 'alpha' });
    const b = link({ id: 'b', title: 'beta' });
    const { kiClient } = createKiClient([a, b], { a: [b], b: [a] });
    await reconcileCodeAndLogQueries({
      streamName: 'logs.checkout',
      kiClient,
      logger: loggerMock.create(),
    });
    expect(kiClient.findQueries).toHaveBeenCalledWith(
      'logs.checkout',
      expect.any(String),
      expect.objectContaining({ minScore: RECONCILE_MIN_SCORE }),
      'semantic'
    );
  });

  it('logs an audit line naming the canonical and every tombstoned query', async () => {
    const keep = link({ id: 'keep', title: 'Payment failed', severity: 70 });
    const drop = link({ id: 'drop', title: 'Payment failure', severity: 10 });
    const { kiClient } = createKiClient([keep, drop], { keep: [drop], drop: [keep] });
    const logger = loggerMock.create();
    await reconcileCodeAndLogQueries({ streamName: 'logs.checkout', kiClient, logger });
    const audit = logger.info.mock.calls.map((c) => String(c[0])).join('\n');
    expect(audit).toContain('merging into "Payment failed" (keep)');
    expect(audit).toContain('drop "Payment failure"');
  });
});
