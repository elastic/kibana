/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  Collector,
  createCollectorFetchContextMock,
  createUsageCollectionSetupMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { registerContextEngineUsageCollector } from './usage_collector';

const KI_COLUMNS = [
  '_id',
  '_index',
  'id',
  '@timestamp',
  'governance.lifecycle.status',
  'expires_at',
];

const hit = (source: Record<string, unknown>) => ({
  _index: '.contextengine-ai-indices',
  _source: source,
});

const probeResponse = (columns: string[]) => ({
  columns: columns.map((name) => ({ name, type: 'keyword' })),
  values: [],
});

const countsResponse = (counts: Record<string, number>) => ({
  columns: [
    { name: 'count', type: 'long' },
    { name: 'lifecycle', type: 'keyword' },
  ],
  values: Object.entries(counts).map(([lifecycle, count]) => [count, lifecycle]),
});

describe('context_engine usage collector', () => {
  let collector: Collector<unknown>;
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let esqlResponses: Map<string, { columns?: string[]; counts?: Record<string, number> } | Error>;
  const managedDests = new Map<string, AiIndexDest>();

  const setHits = (sources: Array<Record<string, unknown>>) => {
    esClient.search.mockResolvedValue({
      hits: { hits: sources.map(hit) },
    } as unknown as Awaited<ReturnType<typeof esClient.search>>);
  };

  const fetch = () => collector.fetch(createCollectorFetchContextMock());

  beforeEach(() => {
    esClient = elasticsearchClientMock.createElasticsearchClient();
    esqlResponses = new Map();
    managedDests.clear();
    esClient.esql.query.mockImplementation((async ({ query }: { query: string }) => {
      const [, dest] = query.match(/^FROM "([^"]+)"/) ?? [];
      const response = esqlResponses.get(dest) ?? { columns: KI_COLUMNS, counts: {} };
      if (response instanceof Error) {
        throw response;
      }
      return query.includes('LIMIT 0')
        ? probeResponse(response.columns ?? KI_COLUMNS)
        : countsResponse(response.counts ?? {});
    }) as unknown as typeof esClient.esql.query);

    const usageCollection = createUsageCollectionSetupMock();
    usageCollection.makeUsageCollector.mockImplementation((config) => {
      collector = new Collector(loggerMock.create(), config);
      return createUsageCollectionSetupMock().makeUsageCollector(config);
    });
    registerContextEngineUsageCollector({
      usageCollection,
      getEsClient: async () => esClient,
      getManagedDest: (id) => managedDests.get(id),
      logger: loggerMock.create(),
    });
  });

  it('registers the collector', () => {
    expect(collector.type).toBe('context_engine');
    expect(collector.isReady()).toBe(true);
  });

  it('counts entries from all spaces', async () => {
    setHits([
      { id: 'a', space: 'default', dest: { type: 'index', value: 'ai-index-idx-a' } },
      { id: 'b', space: 'other', dest: { type: 'data_stream', value: 'ai-index-ds-b' } },
      { id: 'c', space: 'third', managed: false, dest: { type: 'index', value: 'ai-index-idx-c' } },
    ]);
    esqlResponses.set('ai-index-idx-a', { counts: { active: 3, deleted: 1 } });
    esqlResponses.set('ai-index-ds-b', { counts: { active: 2, expired: 4 } });

    const usage = await fetch();

    expect(esClient.search).toHaveBeenCalledWith(
      expect.not.objectContaining({ query: expect.anything() })
    );
    expect(usage).toEqual({
      ai_indices: { user: 3, managed: 0 },
      kis: {
        user: { active: 5, expired: 4, deleted: 1 },
        managed: { active: 0, expired: 0, deleted: 0 },
      },
    });
  });

  it('takes managed dest from the registration', async () => {
    managedDests.set('elastic', { type: 'index', value: '.ai-index-idx-elastic-index' });
    setHits([
      { id: 'elastic', space: 'default', managed: true, dest: { type: 'index', value: 'stale' } },
      { id: 'elastic', space: 'other', managed: true, dest: { type: 'index', value: 'stale' } },
    ]);
    esqlResponses.set('.ai-index-idx-elastic-index', { counts: { active: 7 } });

    const usage = await fetch();

    expect(usage).toEqual({
      ai_indices: { user: 0, managed: 2 },
      kis: {
        user: { active: 0, expired: 0, deleted: 0 },
        managed: { active: 7, expired: 0, deleted: 0 },
      },
    });
    expect(esClient.esql.query).not.toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.stringContaining('stale') })
    );
  });

  it('skips pattern dests', async () => {
    setHits([{ id: 'legacy', dest: { type: 'index', value: 'logs-*' } }]);

    const usage = await fetch();

    expect(usage).toMatchObject({ ai_indices: { user: 1 } });
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });

  it.each([
    ['user first', ['user', 'managed']],
    ['managed first', ['managed', 'user']],
  ])('attributes a shared dest to managed (%s)', async (_, order) => {
    const shared: AiIndexDest = { type: 'index', value: 'ai-index-idx-nightshift-cortex' };
    managedDests.set('nightshift-cortex', shared);
    const entries: Record<string, Record<string, unknown>> = {
      user: { id: 'squatter', dest: shared },
      managed: { id: 'nightshift-cortex', managed: true, dest: shared },
    };
    setHits(order.map((owner) => entries[owner]));
    esqlResponses.set(shared.value, { counts: { active: 4 } });

    const usage = await fetch();

    expect(usage).toEqual({
      ai_indices: { user: 1, managed: 1 },
      kis: {
        user: { active: 0, expired: 0, deleted: 0 },
        managed: { active: 4, expired: 0, deleted: 0 },
      },
    });
  });

  it('counts unreadable dests as zero', async () => {
    setHits([
      { id: 'broken', dest: { type: 'index', value: 'ai-index-idx-broken' } },
      { id: 'ok', dest: { type: 'index', value: 'ai-index-idx-ok' } },
    ]);
    esqlResponses.set('ai-index-idx-broken', new Error('boom'));
    esqlResponses.set('ai-index-idx-ok', { counts: { active: 1 } });

    const usage = await fetch();

    expect(usage).toEqual({
      ai_indices: { user: 2, managed: 0 },
      kis: {
        user: { active: 1, expired: 0, deleted: 0 },
        managed: { active: 0, expired: 0, deleted: 0 },
      },
    });
  });

  it('guards unmapped lifecycle fields', async () => {
    setHits([{ id: 'bare', dest: { type: 'data_stream', value: 'ai-index-ds-bare' } }]);
    esqlResponses.set('ai-index-ds-bare', { columns: ['_id', '_index'], counts: { active: 2 } });

    await fetch();

    const [[{ query }]] = esClient.esql.query.mock.calls.filter(
      ([params]) => !(params as { query: string }).query.includes('LIMIT 0')
    ) as Array<[{ query: string }]>;
    expect(query).not.toContain('governance.lifecycle.status');
    expect(query).not.toContain('expires_at');
    expect(query).not.toContain('@timestamp');
  });
});
