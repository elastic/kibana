/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import { resolveOntologyConfig } from '../../common/ontology';
import { describeAiIndexFields } from '../ai_indices/describe_fields';
import type { AiIndexField } from '../ai_indices/types';
import { catalogOntologySources, fingerprintOf } from './catalog';
import { datasetKiId, esqlSourceId } from './ids';

jest.mock('../ai_indices/describe_fields');

const NOW = new Date('2026-11-18T12:00:00.000Z');

const ordersFields: AiIndexField[] = [
  { path: '@timestamp', type: 'date', searchable: true, aggregatable: true },
  { path: 'customer', type: 'object', searchable: false, aggregatable: false },
  { path: 'customer.email', type: 'keyword', searchable: true, aggregatable: true },
  { path: 'status', type: 'keyword', searchable: true, aggregatable: true },
  { path: 'total', type: 'double', searchable: true, aggregatable: true },
];

const aiIndex = (sources: AiIndexItem['sources']): AiIndexItem => ({
  id: 'shop',
  dest: { type: 'index', value: 'ai-index-idx-shop' },
  managed: false,
  automations: [],
  sources,
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
});

const ORDERS_SOURCE = { type: 'esql' as const, value: 'FROM orders, logs-* | LIMIT 10' };

interface MockClient {
  resolveIndex: jest.Mock;
  esql: jest.Mock;
  search: jest.Mock;
  client: ElasticsearchClient;
}

const esqlResponse = (columns: string[], values: unknown[][]) => ({
  columns: columns.map((name) => ({ name, type: 'keyword' })),
  values,
});

const mockClient = (existing: unknown[] = []): MockClient => {
  const resolveIndex = jest.fn(async () => ({
    indices: [
      { name: 'orders', attributes: ['open'] },
      {
        name: '.ds-logs-app-default-000001',
        attributes: ['open'],
        data_stream: 'logs-app-default',
      },
      { name: '.hidden-thing', attributes: ['open', 'hidden'] },
    ],
    aliases: [],
    data_streams: [
      { name: 'logs-app-default', backing_indices: [], timestamp_field: '@timestamp' },
    ],
  }));
  const esql = jest.fn(async ({ query }: { query: string }) => {
    if (query.includes('row_count = COUNT(*)')) {
      return esqlResponse(['row_count', 'earliest', 'latest'], [[42, '2026-01-01', '2026-11-01']]);
    }
    if (query.includes('COUNT_DISTINCT')) {
      return esqlResponse(['d0', 'd1'], [[40, 3]]);
    }
    if (query.includes('STATS count = COUNT(*) BY')) {
      return esqlResponse(
        ['count', 'status'],
        [
          [30, 'paid'],
          [12, 'open'],
        ]
      );
    }
    if (query.includes('n0_min')) {
      return esqlResponse(['n0_min', 'n0_max', 'n0_avg'], [[1, 900, 120.5]]);
    }
    throw new Error(`unexpected query ${query}`);
  });
  const search = jest.fn(async () => ({
    hits: { hits: existing.map((source) => ({ _source: source })) },
  }));
  return {
    resolveIndex,
    esql,
    search,
    client: {
      indices: { resolveIndex },
      esql: { query: esql },
      search,
    } as unknown as ElasticsearchClient,
  };
};

const run = (
  client: MockClient,
  {
    sources = [ORDERS_SOURCE],
    config = { enabled: true },
    maxDatasets = 10,
  }: {
    sources?: AiIndexItem['sources'];
    config?: Parameters<typeof resolveOntologyConfig>[0];
    maxDatasets?: number;
  } = {}
) =>
  catalogOntologySources({
    esClient: client.client,
    aiIndex: aiIndex(sources),
    spaceId: 'default',
    config: resolveOntologyConfig(config),
    maxDatasets,
    now: NOW,
  });

const catalogFieldsOf = (fields: AiIndexField[]) =>
  fields
    .filter(({ type }) => type !== 'object')
    .map(({ path, type, searchable, aggregatable }) => ({
      name: path,
      type,
      searchable,
      aggregatable,
    }));

describe('catalogOntologySources', () => {
  beforeEach(() => {
    jest.mocked(describeAiIndexFields).mockImplementation(async ({ target }) => {
      const fields = target === 'orders' ? ordersFields : [];
      return { fields, allFields: fields, semanticFields: [], omittedFieldCount: 0 };
    });
  });

  it('catalogs the data streams and indices a source reads, leaving out backing and hidden indices', async () => {
    const client = mockClient();

    const output = await run(client);

    expect(client.resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({ name: ['orders', 'logs-*'], expand_wildcards: 'open' }),
      expect.anything()
    );
    expect(output.catalog).toEqual([
      {
        name: 'logs-app-default',
        kind: 'data_stream',
        source_ids: [esqlSourceId(ORDERS_SOURCE.value)],
        fields: [],
      },
      {
        name: 'orders',
        kind: 'index',
        source_ids: [esqlSourceId(ORDERS_SOURCE.value)],
        fields: catalogFieldsOf(ordersFields),
      },
    ]);
    expect(output.sources).toEqual([
      { id: esqlSourceId(ORDERS_SOURCE.value), value: ORDERS_SOURCE.value, datasets: 2 },
    ]);
  });

  it('profiles a new dataset, skipping top values of fields whose names look sensitive', async () => {
    const client = mockClient();

    const { datasets } = await run(client);
    const orders = datasets.find(({ name }) => name === 'orders');

    expect(orders).toEqual(
      expect.objectContaining({
        id: datasetKiId('orders'),
        reason: 'new',
        time_field: '@timestamp',
        row_count: 42,
        earliest: '2026-01-01',
        latest: '2026-11-01',
        errors: [],
      })
    );
    expect(orders?.fields).toEqual([
      { name: '@timestamp', type: 'date' },
      { name: 'customer.email', type: 'keyword', distinct: 40 },
      {
        name: 'status',
        type: 'keyword',
        distinct: 3,
        top_values: [
          { value: 'paid', count: 30 },
          { value: 'open', count: 12 },
        ],
      },
      { name: 'total', type: 'double', min: 1, max: 900, avg: 120.5 },
    ]);
    const queries = client.esql.mock.calls.map(([{ query }]) => query);
    expect(queries).toContain(
      'FROM "orders" | WHERE `@timestamp` >= NOW() - 30 days | WHERE `status` IS NOT NULL | STATS count = COUNT(*) BY `status` | SORT count DESC | LIMIT 5'
    );
    expect(queries.some((query) => query.includes('BY `customer.email`'))).toBe(false);
  });

  it('reads no top values when value samples are off', async () => {
    const client = mockClient();

    const { datasets } = await run(client, { config: { enabled: true, value_samples: false } });

    const queries = client.esql.mock.calls.map(([{ query }]) => query);
    expect(queries.some((query) => query.includes('BY `status`'))).toBe(false);
    expect(datasets.find(({ name }) => name === 'orders')?.fields[2]).toEqual({
      name: 'status',
      type: 'keyword',
      distinct: 3,
    });
  });

  it('skips unchanged and certified datasets, and re-profiles changed or stale ones', async () => {
    const fingerprint = fingerprintOf(catalogFieldsOf(ordersFields));
    const client = mockClient([
      {
        id: datasetKiId('orders'),
        type: 'ontology.dataset',
        title: 'orders',
        attributes: {
          'ontology.index': 'orders',
          'ontology.fingerprint': fingerprint,
          'ontology.profiled_at': '2026-11-17T12:00:00.000Z',
        },
      },
      {
        id: datasetKiId('logs-app-default'),
        type: 'ontology.dataset',
        title: 'logs-app-default',
        attributes: { 'ontology.index': 'logs-app-default', 'ontology.status': 'certified' },
      },
    ]);

    const fresh = await run(client);
    expect(fresh.datasets).toEqual([]);
    expect(fresh.skipped).toEqual([
      { name: 'logs-app-default', reason: 'certified' },
      { name: 'orders', reason: 'unchanged' },
    ]);

    const later = await run(client, { config: { enabled: true, refresh_interval: '12h' } });
    expect(later.datasets.map(({ name, reason }) => [name, reason])).toEqual([
      ['orders', 'refresh'],
    ]);
  });

  it('defers datasets over the per-run cap, new ones first', async () => {
    const client = mockClient();

    const { datasets, skipped } = await run(client, { maxDatasets: 1 });

    expect(datasets.map(({ name }) => name)).toEqual(['logs-app-default']);
    expect(skipped).toEqual([{ name: 'orders', reason: 'deferred to a later run' }]);
  });

  it('reports dataset KIs no source reads any more as stale, but none when a source failed', async () => {
    const gone = {
      id: datasetKiId('old'),
      type: 'ontology.dataset',
      title: 'old',
      attributes: { 'ontology.index': 'old' },
    };
    const client = mockClient([gone]);

    expect((await run(client)).stale).toEqual([datasetKiId('old')]);

    client.resolveIndex.mockRejectedValueOnce(new Error('cluster unavailable'));
    const failed = await run(client);
    expect(failed.stale).toEqual([]);
    expect(failed.sources).toEqual([
      expect.objectContaining({ datasets: 0, error: 'cluster unavailable' }),
    ]);
  });

  it('reports a source without FROM, and a profile query that fails, without stopping', async () => {
    const client = mockClient();
    client.esql.mockImplementation(async ({ query }: { query: string }) => {
      if (query.includes('COUNT_DISTINCT')) {
        throw new Error('boom');
      }
      return esqlResponse(['row_count'], [[1]]);
    });

    const output = await run(client, {
      sources: [
        ORDERS_SOURCE,
        { type: 'esql', value: 'ROW a = 1' },
        { type: 'connector', value: 'c' },
      ],
    });

    expect(output.sources[1]).toEqual(
      expect.objectContaining({ datasets: 0, error: 'The source query has no FROM to read.' })
    );
    expect(output.datasets.find(({ name }) => name === 'orders')?.errors).toEqual([
      'distinct counts: boom',
    ]);
  });
});
