/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  KnowledgeIndicatorClient,
  type KnowledgeIndicatorClientDeps,
} from './knowledge_indicator_client';
import { computeFeatureUuid } from '@kbn/significant-events-schema';
import {
  type StoredFeatureKnowledgeIndicator,
  type StoredQueryKnowledgeIndicator,
  type StoredTombstone,
} from '../data_stream';
import type { SignificantEventsAlertingContext } from '../../significant_events/alerting/significant_events_alerting_context';
import { ALERTS_READER_V2 } from '../../significant_events/alerting/alerts_reader';
import { KI_TYPE_FEATURE, KI_TYPE_QUERY } from '../fields';

jest.mock('../../significant_events/latest_source_query', () => {
  const actual = jest.requireActual('../../significant_events/latest_source_query');
  return {
    ...actual,
    executeAndDecodeSource: jest.fn(),
    queryEsql: jest.fn(),
  };
});

jest.mock('./bulk_with_inference_fallback', () => {
  const actual = jest.requireActual('./bulk_with_inference_fallback');
  return {
    ...actual,
    bulkCreateWithInferenceFallback: jest.fn(async (_logger, attempt) =>
      attempt({ includeEmbedding: true })
    ),
  };
});

import { executeAndDecodeSource, queryEsql } from '../../significant_events/latest_source_query';

const STREAM = 'logs-app';

// Mirrors the server-side derivation: the stored document `id` is the
// deterministic uuid computed from (slug, stream_name).
function featureUuid(slug: string): string {
  return computeFeatureUuid({ id: slug, stream_name: STREAM });
}

function createFeatureDoc(
  overrides: Partial<StoredFeatureKnowledgeIndicator> & { slug?: string } = {}
): StoredFeatureKnowledgeIndicator {
  const { slug = 'feat-1', ...rest } = overrides;
  return {
    '@timestamp': '2026-01-01T00:00:00.000Z',
    id: featureUuid(slug),
    type: KI_TYPE_FEATURE,
    'stream.name': STREAM,
    title: 'Some entity',
    description: 'desc',
    feature: {
      slug,
      type: 'entity',
      subtype: 'service',
      properties: { name: 'checkout' },
      confidence: 80,
    },
    ...rest,
  };
}

function createComputedFeatureDoc(): StoredFeatureKnowledgeIndicator {
  return createFeatureDoc({
    id: 'computed-1-uuid',
    feature: {
      slug: 'computed-1',
      type: 'dataset_analysis',
      properties: {},
      confidence: 100,
    },
  });
}

function createAlertingContext(
  rulesManagementClient: SignificantEventsAlertingContext['rulesClient']
): SignificantEventsAlertingContext {
  return {
    alertsReader: ALERTS_READER_V2,
    rulesClient: rulesManagementClient,
  };
}

function makeClient(): {
  client: KnowledgeIndicatorClient;
  create: jest.Mock;
  runEsql: jest.Mock;
  logger: Logger;
} {
  const create = jest.fn().mockResolvedValue({ errors: false, items: [] });
  const dataStreamClient = {
    create,
  } as unknown as KnowledgeIndicatorClientDeps['dataStreamClient'];
  const logger = loggerMock.create() as unknown as Logger;
  const deps: KnowledgeIndicatorClientDeps = {
    dataStreamClient,
    esClient: {} as KnowledgeIndicatorClientDeps['esClient'],
    soClient: {} as KnowledgeIndicatorClientDeps['soClient'],
    logger,
  };
  const rulesManagementClient = {
    createRule: jest.fn().mockResolvedValue(undefined),
    updateRule: jest.fn().mockResolvedValue(undefined),
    bulkDeleteRules: jest.fn().mockResolvedValue(undefined),
    findOwnedRuleIds: jest.fn().mockResolvedValue([]),
  };
  const client = new KnowledgeIndicatorClient(
    deps,
    true,
    createAlertingContext(rulesManagementClient)
  );
  return { client, create, runEsql: executeAndDecodeSource as jest.Mock, logger };
}

beforeEach(() => {
  (executeAndDecodeSource as jest.Mock).mockReset();
  (queryEsql as jest.Mock).mockReset();
});

describe('KnowledgeIndicatorClient.bulk', () => {
  describe('exclude', () => {
    it('reads the latest revision and appends a new one with excluded=true', async () => {
      const { client, create, runEsql } = makeClient();
      const latest = createFeatureDoc();
      runEsql.mockResolvedValueOnce({ hits: [latest] });

      const result = await client.bulk(STREAM, [{ exclude: { id: latest.id } }]);

      expect(result).toEqual({ applied: 1, skipped: 0 });
      expect(create).toHaveBeenCalledTimes(1);
      const [{ documents }] = create.mock.calls[0];
      expect(documents).toHaveLength(1);
      const written = documents[0] as StoredFeatureKnowledgeIndicator;
      expect(written.id).toBe(latest.id);
      expect(written.type).toBe(KI_TYPE_FEATURE);
      expect(written.excluded).toBe(true);
      // Payload preserved
      expect(written.feature).toEqual(latest.feature);
      expect(written.title).toBe(latest.title);
      // Fresh @timestamp
      expect(written['@timestamp']).not.toBe(latest['@timestamp']);
    });

    it('skips computed features', async () => {
      const { client, create, runEsql } = makeClient();
      runEsql.mockResolvedValueOnce({ hits: [createComputedFeatureDoc()] });

      const result = await client.bulk(STREAM, [{ exclude: { id: 'computed-1' } }]);

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(create).not.toHaveBeenCalled();
    });

    it('skips when the latest revision is already excluded', async () => {
      const { client, create, runEsql } = makeClient();
      runEsql.mockResolvedValueOnce({ hits: [createFeatureDoc({ excluded: true })] });

      const result = await client.bulk(STREAM, [{ exclude: { id: 'feat-1' } }]);

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(create).not.toHaveBeenCalled();
    });

    it('skips unknown ids', async () => {
      const { client, create, runEsql } = makeClient();
      runEsql.mockResolvedValueOnce({ hits: [] });

      const result = await client.bulk(STREAM, [{ exclude: { id: 'missing' } }]);

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('reads the latest revision and re-indexes with excluded cleared and fresh timestamps', async () => {
      const { client, create, runEsql } = makeClient();
      const latest = createFeatureDoc({ excluded: true });
      runEsql.mockResolvedValueOnce({ hits: [latest] });

      const result = await client.bulk(STREAM, [{ restore: { id: latest.id } }]);

      expect(result).toEqual({ applied: 1, skipped: 0 });
      expect(runEsql).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledTimes(1);
      const [{ documents }] = create.mock.calls[0];
      expect(documents).toHaveLength(1);
      const written = documents[0] as StoredFeatureKnowledgeIndicator;
      expect(written.id).toBe(latest.id);
      expect(written.type).toBe(KI_TYPE_FEATURE);
      expect(written.excluded).toBeUndefined();
      // Payload preserved
      expect(written.feature).toEqual(latest.feature);
      expect(written.title).toBe(latest.title);
      // Fresh @timestamp
      expect(written['@timestamp']).not.toBe(latest['@timestamp']);
    });

    it('skips unknown ids', async () => {
      const { client, create, runEsql } = makeClient();
      runEsql.mockResolvedValueOnce({ hits: [] });

      const result = await client.bulk(STREAM, [{ restore: { id: 'missing' } }]);

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(create).not.toHaveBeenCalled();
    });

    it('skips computed features', async () => {
      const { client, create, runEsql } = makeClient();
      runEsql.mockResolvedValueOnce({ hits: [createComputedFeatureDoc()] });

      const result = await client.bulk(STREAM, [{ restore: { id: 'computed-1' } }]);

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('reads the latest revision and appends a tombstone for known ids', async () => {
      const { client, create, runEsql } = makeClient();
      runEsql.mockResolvedValueOnce({ hits: [createFeatureDoc({ id: 'feat-1' })] });

      const result = await client.bulk(STREAM, [
        { delete: { type: KI_TYPE_FEATURE, id: 'feat-1' } },
      ]);

      expect(result).toEqual({ applied: 1, skipped: 0 });
      expect(runEsql).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledTimes(1);
      const [{ documents }] = create.mock.calls[0];
      const written = documents[0] as StoredTombstone;
      expect(written.deleted).toBe(true);
    });

    it('skips unknown ids', async () => {
      const { client, create, runEsql } = makeClient();
      runEsql.mockResolvedValueOnce({ hits: [] });

      const result = await client.bulk(STREAM, [
        { delete: { type: KI_TYPE_FEATURE, id: 'non-existent' } },
      ]);

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(create).not.toHaveBeenCalled();
    });
  });
});

describe('KnowledgeIndicatorClient.deleteIndicators', () => {
  it('tombstones every active revision when the create succeeds', async () => {
    const { client, create, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({
      hits: [createFeatureDoc({ id: 'feat-1' }), createFeatureDoc({ id: 'feat-2' })],
    });

    await client.deleteIndicators(STREAM);

    expect(create).toHaveBeenCalledTimes(1);
    const [{ documents }] = create.mock.calls[0];
    expect(documents).toHaveLength(2);
    expect(documents.every((d: StoredTombstone) => d.deleted === true)).toBe(true);
  });

  it('throws when the tombstone write reports errors', async () => {
    const { client, create, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({ hits: [createFeatureDoc({ id: 'feat-1' })] });
    create.mockResolvedValueOnce({
      errors: true,
      items: [
        {
          create: { status: 500, error: { type: 'es_rejected_execution_exception', reason: 'x' } },
        },
      ],
    });

    await expect(client.deleteIndicators(STREAM)).rejects.toThrow(/Failed to delete indicators/);
  });

  it('is a no-op when there are no active revisions', async () => {
    const { client, create, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({ hits: [] });

    await client.deleteIndicators(STREAM);

    expect(create).not.toHaveBeenCalled();
  });
});

describe('KnowledgeIndicatorClient.getStreamNamesWithKnowledgeIndicators', () => {
  it('returns distinct sorted stream names from active feature and query revisions', async () => {
    const { client, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({
      hits: [
        createFeatureDoc({ 'stream.name': 'logs.nginx' }),
        createFeatureDoc({ slug: 'feat-2', 'stream.name': 'logs.apache' }),
        {
          '@timestamp': '2026-01-01T00:00:00.000Z',
          id: 'query-1',
          type: KI_TYPE_QUERY,
          'stream.name': 'logs.nginx',
          title: 'High error rate',
          query: {
            esql: 'FROM logs | STATS c = COUNT(*)',
            query_type: 'match',
            severity_score: 80,
            rule_backed: false,
          },
        },
      ],
    });

    await expect(client.getStreamNamesWithKnowledgeIndicators()).resolves.toEqual([
      'logs.apache',
      'logs.nginx',
    ]);
  });
});

describe('KnowledgeIndicatorClient.getFeatures', () => {
  const printedQueryFor = (runEsql: jest.Mock): string => {
    const query = runEsql.mock.calls[0][1] as { print: () => string };
    return query.print();
  };

  it('hides excluded features by default', async () => {
    const { client, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({ hits: [createFeatureDoc()] });

    await client.getFeatures(STREAM);

    expect(runEsql).toHaveBeenCalledTimes(1);
    // The default filter must include `excluded` — distinct from the
    // tombstone-only filter applied when includeExcluded=true.
    expect(printedQueryFor(runEsql)).toContain('excluded');
  });

  it('returns active and excluded merged when includeExcluded is set', async () => {
    const { client, runEsql } = makeClient();
    const active = createFeatureDoc({ slug: 'a' });
    const excluded = createFeatureDoc({ slug: 'b', excluded: true });
    runEsql.mockResolvedValueOnce({ hits: [active, excluded] });

    const { hits } = await client.getFeatures(STREAM, { includeExcluded: true });

    expect(hits).toHaveLength(2);
    // includeExcluded relaxes back to the tombstone-only filter — should not
    // mention `excluded`.
    expect(printedQueryFor(runEsql)).not.toContain('excluded');
    expect(hits.find((h) => h.id === 'b')?.excluded).toBe(true);
  });

  it('applies feature.type filter when options.type is provided', async () => {
    const { client, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({ hits: [] });

    await client.getFeatures(STREAM, { type: ['entity'] });

    expect(runEsql).toHaveBeenCalledTimes(1);
    expect(printedQueryFor(runEsql)).toContain('feature.type');
  });
});

describe('KnowledgeIndicatorClient.getLatestRevisionTimestamp', () => {
  const printedQueryFor = (runEsql: jest.Mock): string => {
    const query = runEsql.mock.calls[0][1] as { print: () => string };
    return query.print();
  };

  it('returns the newest @timestamp among matching live revisions', async () => {
    const { client, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({
      hits: [
        createFeatureDoc({ id: 'a', '@timestamp': '2026-04-01T00:00:00.000Z' }),
        createFeatureDoc({ id: 'b', '@timestamp': '2026-05-01T00:00:00.000Z' }),
        createFeatureDoc({ id: 'c', '@timestamp': '2026-03-01T00:00:00.000Z' }),
      ],
    });

    const result = await client.getLatestRevisionTimestamp(STREAM);

    expect(result).toEqual({ '@timestamp': '2026-05-01T00:00:00.000Z' });
  });

  it('returns null when no revisions match', async () => {
    const { client, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({ hits: [] });

    const result = await client.getLatestRevisionTimestamp(STREAM);

    expect(result).toBeNull();
  });

  it('filters tombstones and excluded revisions via the post-grouping WHERE', async () => {
    const { client, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({ hits: [] });

    await client.getLatestRevisionTimestamp(STREAM);

    expect(runEsql).toHaveBeenCalledTimes(1);
    // The post-grouping filter must reference both `deleted` and
    // `excluded` so groups whose latest revision is a tombstone or an
    // exclusion drop out. Without this, user-driven bulk deletes or
    // bulk excludes would extend the identification throttle.
    const printed = printedQueryFor(runEsql);
    expect(printed).toContain('deleted');
    expect(printed).toContain('excluded');
  });

  it('passes the feature-type filter through to the WHERE clause', async () => {
    const { client, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({ hits: [] });

    await client.getLatestRevisionTimestamp(STREAM, { types: ['entity', 'metric'] });

    expect(printedQueryFor(runEsql)).toContain('feature.type');
  });
});

describe('KnowledgeIndicatorClient.getExcludedFeatures', () => {
  const printedQueryFor = (runEsql: jest.Mock): string => {
    const query = runEsql.mock.calls[0][1] as { print: () => string };
    return query.print();
  };

  it('returns excluded features in the order returned by ES|QL (sort pushed into query)', async () => {
    const { client, runEsql } = makeClient();
    const older = createFeatureDoc({
      slug: 'old',
      excluded: true,
      '@timestamp': '2026-01-01T00:00:00.000Z',
    });
    const newer = createFeatureDoc({
      slug: 'new',
      excluded: true,
      '@timestamp': '2026-02-01T00:00:00.000Z',
    });
    // ES|QL returns newest-first (DESC); the client preserves that order.
    runEsql.mockResolvedValueOnce({ hits: [newer, older] });

    const { hits } = await client.getExcludedFeatures(STREAM);

    expect(hits.map((h) => h.id)).toEqual(['new', 'old']);
    expect(hits.every((h) => h.excluded === true)).toBe(true);
  });

  it('includes a @timestamp DESC sort in the ES|QL query', async () => {
    const { client, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({ hits: [] });

    await client.getExcludedFeatures(STREAM);

    expect(runEsql).toHaveBeenCalledTimes(1);
    const printed = printedQueryFor(runEsql);
    expect(printed).toContain('@timestamp');
    expect(printed.toUpperCase()).toContain('SORT');
    expect(printed.toUpperCase()).toContain('DESC');
  });
});

describe('KnowledgeIndicatorClient.bulk — lifecycle (expires_at)', () => {
  function createIndexFeatureOp(
    slug = 'feat-1',
    expiresAt?: string
  ): Extract<Parameters<KnowledgeIndicatorClient['bulk']>[1][number], { index: unknown }> {
    return {
      index: {
        feature: {
          id: slug,
          stream_name: STREAM,
          type: 'entity',
          description: 'desc',
          properties: {},
          confidence: 80,
          ...(expiresAt !== undefined ? { expires_at: expiresAt } : {}),
        },
      },
    };
  }

  it('index op without expires_at → durable (no prior read, no expires_at stored)', async () => {
    const { client, create, runEsql } = makeClient();

    await client.bulk(STREAM, [createIndexFeatureOp('feat-1')]);

    // No ES|QL call: bulk never reads priors
    expect(runEsql).not.toHaveBeenCalled();
    const [{ documents }] = create.mock.calls[0];
    const written = documents[0] as StoredFeatureKnowledgeIndicator;
    expect(written.expires_at).toBeUndefined();
  });

  it('explicit expires_at → stored as-is, no prior read', async () => {
    const { client, create, runEsql } = makeClient();
    const explicitDeadline = '2099-12-31T00:00:00.000Z';

    await client.bulk(STREAM, [createIndexFeatureOp('feat-1', explicitDeadline)]);

    expect(runEsql).not.toHaveBeenCalled();
    const [{ documents }] = create.mock.calls[0];
    const written = documents[0] as StoredFeatureKnowledgeIndicator;
    expect(written.expires_at).toBe(explicitDeadline);
  });

  it('exclude with managed prior → inherits managed (fresh expires_at)', async () => {
    const { client, create, runEsql } = makeClient();
    const prior = createFeatureDoc({ expires_at: '2026-01-01T00:00:00.000Z' });
    // prepareExcludes fetches prior for the exclude op
    runEsql.mockResolvedValueOnce({ hits: [prior] });

    await client.bulk(STREAM, [{ exclude: { id: prior.id } }]);

    const [{ documents }] = create.mock.calls[0];
    const written = documents[0] as StoredFeatureKnowledgeIndicator;
    expect(written.excluded).toBe(true);
    expect(written.expires_at).toBeDefined();
    expect(written.expires_at! > '2026-01-01T00:00:00.000Z').toBe(true);
  });

  it('exclude with durable prior → no expires_at', async () => {
    const { client, create, runEsql } = makeClient();
    const prior = createFeatureDoc({});
    delete (prior as Partial<StoredFeatureKnowledgeIndicator>).expires_at;
    runEsql.mockResolvedValueOnce({ hits: [prior] });

    await client.bulk(STREAM, [{ exclude: { id: prior.id } }]);

    const [{ documents }] = create.mock.calls[0];
    const written = documents[0] as StoredFeatureKnowledgeIndicator;
    expect(written.excluded).toBe(true);
    expect(written.expires_at).toBeUndefined();
  });

  it('restore with managed prior → inherits managed (fresh expires_at)', async () => {
    const { client, create, runEsql } = makeClient();
    const prior = createFeatureDoc({ excluded: true, expires_at: '2026-01-01T00:00:00.000Z' });
    runEsql.mockResolvedValueOnce({ hits: [prior] });

    await client.bulk(STREAM, [{ restore: { id: prior.id } }]);

    const [{ documents }] = create.mock.calls[0];
    const written = documents[0] as StoredFeatureKnowledgeIndicator;
    expect(written.excluded).toBeUndefined();
    expect(written.expires_at).toBeDefined();
    expect(written.expires_at! > '2026-01-01T00:00:00.000Z').toBe(true);
  });

  it('restore with durable prior → no expires_at', async () => {
    const { client, create, runEsql } = makeClient();
    const prior = createFeatureDoc({ excluded: true });
    delete (prior as Partial<StoredFeatureKnowledgeIndicator>).expires_at;
    runEsql.mockResolvedValueOnce({ hits: [prior] });

    await client.bulk(STREAM, [{ restore: { id: prior.id } }]);

    const [{ documents }] = create.mock.calls[0];
    const written = documents[0] as StoredFeatureKnowledgeIndicator;
    expect(written.excluded).toBeUndefined();
    expect(written.expires_at).toBeUndefined();
  });
});

describe('KnowledgeIndicatorClient.findIndicators search', () => {
  function makeClientWithRanker(): {
    client: KnowledgeIndicatorClient;
    runEsql: jest.Mock;
    rankEsql: jest.Mock;
    logger: Logger;
  } {
    const create = jest.fn().mockResolvedValue({ errors: false, items: [] });
    const dataStreamClient = {
      create,
    } as unknown as KnowledgeIndicatorClientDeps['dataStreamClient'];
    const logger = loggerMock.create() as unknown as Logger;
    const deps: KnowledgeIndicatorClientDeps = {
      dataStreamClient,
      esClient: {} as KnowledgeIndicatorClientDeps['esClient'],
      soClient: {} as KnowledgeIndicatorClientDeps['soClient'],
      logger,
    };
    const rulesManagementClient = {
      createRule: jest.fn().mockResolvedValue(undefined),
      updateRule: jest.fn().mockResolvedValue(undefined),
      bulkDeleteRules: jest.fn().mockResolvedValue(undefined),
      findOwnedRuleIds: jest.fn().mockResolvedValue([]),
    };
    const client = new KnowledgeIndicatorClient(
      deps,
      true,
      createAlertingContext(rulesManagementClient)
    );
    const rankEsql = queryEsql as jest.Mock;
    rankEsql.mockResolvedValue({ columns: [], values: [] });
    return { client, runEsql: executeAndDecodeSource as jest.Mock, rankEsql, logger };
  }

  const rankedResponse = (
    rows: Array<{
      id: string;
      'stream.name': string;
      type: typeof KI_TYPE_FEATURE | typeof KI_TYPE_QUERY;
      '@timestamp': string;
    }>
  ) => ({
    columns: [
      { name: 'id', type: 'keyword' },
      { name: 'stream.name', type: 'keyword' },
      { name: 'type', type: 'keyword' },
      { name: '@timestamp', type: 'date' },
    ],
    values: rows.map((row) => [row.id, row['stream.name'], row.type, row['@timestamp']]),
  });

  const rankRequest = (rankEsql: jest.Mock): { query: string; params: unknown[] } => {
    const composerQuery = rankEsql.mock.calls[0][0].query as {
      toRequest: () => { query: string; params: unknown[] };
    };
    return composerQuery.toRequest();
  };

  it('uses only feature fields when type is [feature]', async () => {
    const { client, runEsql, rankEsql } = makeClientWithRanker();
    runEsql.mockResolvedValueOnce({ hits: [createFeatureDoc()] });

    await client.findIndicators(STREAM, 'checkout', {
      types: [KI_TYPE_FEATURE],
      searchMode: 'keyword',
    });

    expect(rankEsql).toHaveBeenCalledTimes(1);
    const { query } = rankRequest(rankEsql);
    expect(query).toContain('TO_LOWER(`feature.type`) LIKE');
    expect(query).toContain('TO_LOWER(`feature.subtype`) LIKE');
    expect(query).toContain('MV_CONCAT(TO_LOWER(tags), " ") LIKE "*checkout*"');
    expect(query).not.toContain('query.esql');
    expect(query).not.toContain('query.features.id');
    expect(query).toContain('EVAL _score = CASE');
    expect(query).toContain('CASE(TO_LOWER(title) LIKE "*checkout*", 3.0, 0.0)');
    expect(query).toContain('CASE(TO_LOWER(description) LIKE "*checkout*", 2.0, 0.0)');
  });

  it('uses only query fields when type is [query]', async () => {
    const { client, runEsql, rankEsql } = makeClientWithRanker();
    runEsql.mockResolvedValueOnce({ hits: [createQueryDoc({ id: 'q-1' })] });

    await client.findIndicators(STREAM, 'SELECT', {
      types: [KI_TYPE_QUERY],
      searchMode: 'keyword',
    });

    expect(rankEsql).toHaveBeenCalledTimes(1);
    const { query } = rankRequest(rankEsql);
    expect(query).toContain('TO_LOWER(`query.esql`) LIKE');
    expect(query).toContain('TO_LOWER(`query.features.id`) LIKE');
    expect(query).not.toContain('feature.type');
    expect(query).not.toContain('feature.subtype');
    expect(query).not.toContain('MV_CONCAT(TO_LOWER(tags)');
  });

  it('matches tags by substring, not exact element (recall parity with DSL wildcard)', async () => {
    const { client, runEsql, rankEsql } = makeClientWithRanker();
    runEsql.mockResolvedValueOnce({ hits: [createFeatureDoc()] });

    // Searching a partial tag token (e.g. `client`) must still surface features
    // whose tag *contains* it (e.g. `browser-client`), matching the pre-migration
    // DSL `wildcard('tags', '*client*')`. The regression was `MV_CONTAINS`, which
    // only matched a tag element exactly equal to the query.
    await client.findIndicators(STREAM, 'client', {
      types: [KI_TYPE_FEATURE],
      searchMode: 'keyword',
    });

    const { query } = rankRequest(rankEsql);
    // Substring form: join the multivalue then apply the shared `*<query>*` pattern.
    expect(query).toContain('MV_CONCAT(TO_LOWER(tags), " ") LIKE "*client*"');
    expect(query).toContain('CASE(MV_CONCAT(TO_LOWER(tags), " ") LIKE "*client*", 1.0, 0.0)');
    // The exact-element form must be gone.
    expect(query).not.toContain('MV_CONTAINS');
  });

  it('uses double keyword scores in hybrid search', async () => {
    const { client, runEsql, rankEsql } = makeClientWithRanker();
    runEsql.mockResolvedValueOnce({ hits: [createFeatureDoc()] });

    await client.findIndicators(STREAM, 'checkout service', {
      types: [KI_TYPE_FEATURE],
      searchMode: 'hybrid',
    });

    const { query } = rankRequest(rankEsql);
    expect(query).toContain('FUSE RRF');
    expect(query).toContain('CASE(TO_LOWER(title) LIKE "*checkout service*", 3.0, 0.0)');
    expect(query).toContain('CASE(TO_LOWER(description) LIKE "*checkout service*", 2.0, 0.0)');
  });

  it('normalizes and thresholds semantic scores in ES|QL', async () => {
    const { client, runEsql, rankEsql } = makeClientWithRanker();
    runEsql.mockResolvedValueOnce({ hits: [createFeatureDoc()] });

    await client.findIndicators(STREAM, 'checkout service', {
      types: [KI_TYPE_FEATURE],
      searchMode: 'semantic',
      limit: 25,
    });

    const request = rankRequest(rankEsql);
    expect(request.query).toContain('METADATA _score, _id, _index');
    expect(request.query).toContain('MATCH(search_embedding, ?q)');
    expect(request.query).toContain('FUSE LINEAR WITH {"normalizer": "minmax"}');
    expect(request.query).toContain('WHERE _score >= 0.15');
    expect(request.query).toContain(
      'KEEP _id, _index, _score, id, `stream.name`, type, @timestamp'
    );
    expect(request.query).toContain('SORT _score DESC | LIMIT 25');
    expect(request.params).toEqual([{ q: 'checkout service' }]);
  });

  it('thresholds the normalized semantic branch before hybrid RRF fusion', async () => {
    const { client, runEsql, rankEsql } = makeClientWithRanker();
    runEsql.mockResolvedValueOnce({ hits: [createFeatureDoc()] });

    await client.findIndicators(STREAM, 'checkout service', {
      types: [KI_TYPE_FEATURE],
      searchMode: 'hybrid',
    });

    const request = rankRequest(rankEsql);
    expect(request.query).toContain('METADATA _score, _id, _index');
    const linearFuse = request.query.indexOf(
      'FUSE LINEAR GROUP BY label WITH {"normalizer": "minmax"}'
    );
    const threshold = request.query.indexOf('WHERE _score >= 0.15');
    const rrfFuse = request.query.indexOf('FUSE RRF WITH {"rank_constant": 20}');
    expect(linearFuse).toBeGreaterThan(-1);
    expect(threshold).toBeGreaterThan(linearFuse);
    expect(rrfFuse).toBeGreaterThan(threshold);
    expect(request.query.match(/KEEP _id, _index, _score/g)).toHaveLength(2);
    expect(request.params).toEqual([{ q: 'checkout service' }]);
  });

  it('dedupes ranked rows to one per group and emits the phase-1 latest payload', async () => {
    const { client, runEsql, rankEsql } = makeClientWithRanker();

    const latestTs = '2026-03-01T00:00:00.000Z';
    const olderTs = '2026-01-01T00:00:00.000Z';

    // Phase 1: the authoritative latest revision for the group.
    runEsql.mockResolvedValueOnce({
      hits: [
        createFeatureDoc({ id: 'feat-1', '@timestamp': latestTs, title: 'authoritative-latest' }),
      ],
    });

    // Phase 2: ES|QL ranks several rows for the same group — two share the latest
    // timestamp (a tie) with different payloads, one is an older revision. The
    // result must be a single hit carrying the phase-1 payload regardless of
    // which row ranked first.
    rankEsql.mockResolvedValueOnce(
      rankedResponse([
        { id: 'feat-1', 'stream.name': STREAM, type: KI_TYPE_FEATURE, '@timestamp': latestTs },
        { id: 'feat-1', 'stream.name': STREAM, type: KI_TYPE_FEATURE, '@timestamp': latestTs },
        { id: 'feat-1', 'stream.name': STREAM, type: KI_TYPE_FEATURE, '@timestamp': olderTs },
      ])
    );

    const { hits } = await client.findIndicators(STREAM, 'checkout', {
      types: [KI_TYPE_FEATURE],
      searchMode: 'hybrid',
    });

    expect(hits).toHaveLength(1);
    expect(hits[0].type).toBe('feature');
    expect(hits[0].type === 'feature' && hits[0].feature.title).toBe('authoritative-latest');
  });

  it('drops a group whose latest revision did not match the query', async () => {
    const { client, runEsql, rankEsql } = makeClientWithRanker();

    // Phase 1 latest is newer than any matching ranked row below.
    runEsql.mockResolvedValueOnce({
      hits: [createFeatureDoc({ id: 'feat-1', '@timestamp': '2026-03-01T00:00:00.000Z' })],
    });

    // Only a stale revision matched the query — the group must not resurface.
    rankEsql.mockResolvedValueOnce(
      rankedResponse([
        {
          id: 'feat-1',
          'stream.name': STREAM,
          type: KI_TYPE_FEATURE,
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
      ])
    );

    const { hits } = await client.findIndicators(STREAM, 'checkout', {
      types: [KI_TYPE_FEATURE],
      searchMode: 'semantic',
    });

    expect(hits).toHaveLength(0);
  });

  it('falls back from auto-resolved hybrid to keyword when semantic search fails', async () => {
    const { client, runEsql, rankEsql, logger } = makeClientWithRanker();
    const latest = createFeatureDoc();
    runEsql.mockResolvedValue({ hits: [latest] });
    rankEsql
      .mockRejectedValueOnce(new Error('inference endpoint unavailable'))
      .mockResolvedValueOnce(rankedResponse([latest]));

    const { hits } = await client.findIndicators(STREAM, 'checkout', {
      types: [KI_TYPE_FEATURE],
    });

    expect(rankEsql).toHaveBeenCalledTimes(2);
    expect(rankRequest(rankEsql).query).toContain('FUSE RRF');
    const fallbackQuery = (
      rankEsql.mock.calls[1][0].query as { toRequest: () => { query: string } }
    ).toRequest().query;
    expect(fallbackQuery).not.toContain('FUSE');
    expect(hits).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('falling back to keyword'));
  });

  it('propagates failures for an explicitly requested hybrid search', async () => {
    const { client, runEsql, rankEsql } = makeClientWithRanker();
    runEsql.mockResolvedValueOnce({ hits: [createFeatureDoc()] });
    rankEsql.mockRejectedValueOnce(new Error('inference endpoint unavailable'));

    await expect(
      client.findIndicators(STREAM, 'checkout', {
        types: [KI_TYPE_FEATURE],
        searchMode: 'hybrid',
      })
    ).rejects.toThrow('inference endpoint unavailable');
    expect(rankEsql).toHaveBeenCalledTimes(1);
  });
});

function createQueryDoc(
  overrides: Partial<StoredQueryKnowledgeIndicator> = {}
): StoredQueryKnowledgeIndicator {
  return {
    '@timestamp': '2026-01-01T00:00:00.000Z',
    id: 'query-1',
    type: KI_TYPE_QUERY,
    'stream.name': STREAM,
    title: 'Error query',
    description: 'desc',
    query: {
      esql: 'FROM logs-app | WHERE error == true',
      query_type: 'match',
      rule_backed: false,
      rule_id: 'rule-abc',
    },
    ...overrides,
  };
}

describe('KnowledgeIndicatorClient.keepAlivePersistentIndicators', () => {
  const LAST_REFRESHED_BEFORE = '2026-06-01T00:00:00.000Z';

  it('re-emits durable features with a fresh @timestamp and no expires_at', async () => {
    const { client, create, runEsql } = makeClient();
    const durableFeature = createFeatureDoc();
    runEsql.mockResolvedValueOnce({ hits: [durableFeature] });

    const result = await client.keepAlivePersistentIndicators(STREAM, {
      lastRefreshedBefore: LAST_REFRESHED_BEFORE,
    });

    expect(result).toEqual({ refreshed: 1 });
    expect(create).toHaveBeenCalledTimes(1);
    const [{ documents }] = create.mock.calls[0];
    expect(documents).toHaveLength(1);
    const written = documents[0] as StoredFeatureKnowledgeIndicator;
    expect(written.id).toBe(durableFeature.id);
    expect(written.type).toBe(KI_TYPE_FEATURE);
    expect(written.expires_at).toBeUndefined();
    expect(written['@timestamp']).not.toBe(durableFeature['@timestamp']);
    expect(written.feature).toEqual(durableFeature.feature);
  });

  it('preserves excluded marker on durable excluded features', async () => {
    const { client, create, runEsql } = makeClient();
    const durableExcluded = createFeatureDoc({ excluded: true });
    runEsql.mockResolvedValueOnce({ hits: [durableExcluded] });

    await client.keepAlivePersistentIndicators(STREAM, {
      lastRefreshedBefore: LAST_REFRESHED_BEFORE,
    });

    const [{ documents }] = create.mock.calls[0];
    const written = documents[0] as StoredFeatureKnowledgeIndicator;
    expect(written.excluded).toBe(true);
    expect(written.expires_at).toBeUndefined();
  });

  it('keeps alive an excluded managed feature, preserving excluded and rolling expires_at forward with @timestamp', async () => {
    const { client, create, runEsql } = makeClient();
    const managedExpiresAt = '2026-07-01T00:00:00.000Z';
    const excludedManaged = createFeatureDoc({ excluded: true, expires_at: managedExpiresAt });
    runEsql.mockResolvedValueOnce({ hits: [excludedManaged] });

    const result = await client.keepAlivePersistentIndicators(STREAM, {
      lastRefreshedBefore: LAST_REFRESHED_BEFORE,
    });

    expect(result).toEqual({ refreshed: 1 });
    const [{ documents }] = create.mock.calls[0];
    const written = documents[0] as StoredFeatureKnowledgeIndicator;
    expect(written.excluded).toBe(true);
    expect(written['@timestamp']).not.toBe(excludedManaged['@timestamp']);
    // expires_at is TTL-bearing, so it rolls forward with the refreshed
    // @timestamp rather than preserving the now-stale original value.
    const { expires_at: rolledExpiresAt } = written;
    expect(rolledExpiresAt).toBeDefined();
    expect(rolledExpiresAt).not.toBe(managedExpiresAt);
    const ttlMs =
      new Date(rolledExpiresAt ?? 0).getTime() - new Date(written['@timestamp']).getTime();
    expect(ttlMs).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -4);
  });

  it('re-emits durable queries with a fresh @timestamp, no expires_at, and preserves rule_backed/rule_id', async () => {
    const { client, create, runEsql } = makeClient();
    const durableQuery = createQueryDoc({
      query: {
        esql: 'FROM logs-app | WHERE error == true',
        query_type: 'match',
        rule_backed: true,
        rule_id: 'rule-xyz',
      },
    });
    runEsql.mockResolvedValueOnce({ hits: [durableQuery] });

    const result = await client.keepAlivePersistentIndicators(STREAM, {
      lastRefreshedBefore: LAST_REFRESHED_BEFORE,
    });

    expect(result).toEqual({ refreshed: 1 });
    const [{ documents }] = create.mock.calls[0];
    expect(documents).toHaveLength(1);
    const written = documents[0] as StoredQueryKnowledgeIndicator;
    expect(written.id).toBe(durableQuery.id);
    expect(written.type).toBe(KI_TYPE_QUERY);
    expect(written.expires_at).toBeUndefined();
    expect(written['@timestamp']).not.toBe(durableQuery['@timestamp']);
    expect(written.query.rule_backed).toBe(true);
    expect(written.query.rule_id).toBe('rule-xyz');
  });

  it('is a no-op when fetchLatestRevisions returns nothing', async () => {
    const { client, create, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({ hits: [] });

    const result = await client.keepAlivePersistentIndicators(STREAM, {
      lastRefreshedBefore: LAST_REFRESHED_BEFORE,
    });

    expect(result).toEqual({ refreshed: 0 });
    expect(create).not.toHaveBeenCalled();
  });

  it('includes the durable-or-excluded predicate and olderThan in the postGrouping WHERE passed to ES|QL', async () => {
    const { client, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({ hits: [] });

    await client.keepAlivePersistentIndicators(STREAM, {
      lastRefreshedBefore: LAST_REFRESHED_BEFORE,
    });

    expect(runEsql).toHaveBeenCalledTimes(1);
    const query = runEsql.mock.calls[0][1] as { print: () => string };
    const printed = query.print();
    expect(printed).toContain('expires_at IS NULL');
    expect(printed).toMatch(/excluded ==/i);
    expect(printed).toContain(LAST_REFRESHED_BEFORE);
  });
});
