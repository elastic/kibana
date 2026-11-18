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
import { datasetKiId, ontologySourceId, sourceUri } from './ids';

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
const SOURCE_ID = ontologySourceId(ORDERS_SOURCE);
const cites = (sourceId = SOURCE_ID) => [{ uri: sourceUri(sourceId), relation: 'derived_from' }];

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
    sourceId = SOURCE_ID,
    config = { enabled: true },
    maxDatasets = 10,
  }: {
    sources?: AiIndexItem['sources'];
    sourceId?: string;
    config?: Parameters<typeof resolveOntologyConfig>[0];
    maxDatasets?: number;
  } = {}
) =>
  catalogOntologySources({
    esClient: client.client,
    aiIndex: aiIndex(sources),
    sourceId,
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

  it('catalogs the data streams and indices its source reads, leaving out backing and hidden indices', async () => {
    const client = mockClient();

    const output = await run(client, {
      sources: [{ type: 'esql', value: 'FROM other' }, ORDERS_SOURCE],
    });

    expect(client.resolveIndex).toHaveBeenCalledTimes(1);
    expect(client.resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({ name: ['orders', 'logs-*'], expand_wildcards: 'open' }),
      expect.anything()
    );
    expect(output.catalog).toEqual([
      { name: 'logs-app-default', kind: 'data_stream', source_ids: [SOURCE_ID], fields: [] },
      {
        name: 'orders',
        kind: 'index',
        source_ids: [SOURCE_ID],
        fields: catalogFieldsOf(ordersFields),
      },
    ]);
    expect(output.source).toEqual({
      id: SOURCE_ID,
      type: 'esql',
      value: ORDERS_SOURCE.value,
      datasets: 2,
    });
  });

  it('lists the index datasets other sources described, with their join fields', async () => {
    const client = mockClient([
      {
        id: datasetKiId('customers'),
        type: 'ontology.dataset',
        title: 'customers',
        attributes: {
          'ontology.index': 'customers',
          'ontology.kind': 'index',
          'ontology.join_fields': ['id:keyword'],
        },
        references: cites('crm'),
      },
      {
        id: datasetKiId('connector:drive'),
        type: 'ontology.dataset',
        title: 'Drive',
        attributes: { 'ontology.index': 'connector:drive', 'ontology.kind': 'connector' },
        references: cites('drive'),
      },
    ]);

    const { others } = await run(client);

    expect(others).toEqual([
      {
        name: 'customers',
        kind: 'index',
        source_ids: ['crm'],
        fields: [{ name: 'id', type: 'keyword', searchable: true, aggregatable: true }],
      },
    ]);
  });

  it('reads nothing for a source the AI index no longer has, or one without FROM', async () => {
    const client = mockClient();
    const row = { type: 'esql' as const, value: 'ROW a = 1' };

    const gone = await run(client, { sourceId: 'gone' });
    const noFrom = await run(client, { sources: [row], sourceId: ontologySourceId(row) });

    expect(client.resolveIndex).not.toHaveBeenCalled();
    expect(gone.source).toEqual(
      expect.objectContaining({ error: 'The AI index has no such ES|QL source any more.' })
    );
    expect(noFrom.source).toEqual(
      expect.objectContaining({ error: 'The source query has no FROM to read.' })
    );
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

  it("skips unchanged datasets, and re-profiles changed, stale or other sources' ones", async () => {
    const described = (
      name: string,
      attributes: Record<string, unknown>,
      sourceId = SOURCE_ID
    ) => ({
      id: datasetKiId(name),
      type: 'ontology.dataset',
      title: name,
      attributes: {
        'ontology.index': name,
        'ontology.profiled_at': '2026-11-17T12:00:00.000Z',
        ...attributes,
      },
      references: cites(sourceId),
    });
    const client = mockClient([
      described('orders', { 'ontology.fingerprint': fingerprintOf(catalogFieldsOf(ordersFields)) }),
      described('logs-app-default', { 'ontology.fingerprint': fingerprintOf([]) }, 'other'),
    ]);

    const fresh = await run(client);
    expect(fresh.datasets.map(({ name, reason }) => [name, reason])).toEqual([
      ['logs-app-default', 'refresh'],
    ]);
    expect(fresh.skipped).toEqual([{ name: 'orders', reason: 'unchanged' }]);

    const later = await run(client, { config: { enabled: true, refresh_interval: '12h' } });
    expect(later.datasets.map(({ name }) => name)).toEqual(['logs-app-default', 'orders']);
  });

  it('defers datasets over the per-run cap, new ones first', async () => {
    const client = mockClient();

    const { datasets, skipped } = await run(client, { maxDatasets: 1 });

    expect(datasets.map(({ name }) => name)).toEqual(['logs-app-default']);
    expect(skipped).toEqual([{ name: 'orders', reason: 'deferred to a later run' }]);
  });

  it('reports the datasets it described but no longer reads as stale, none when it failed', async () => {
    const dataset = (name: string, sourceId: string) => ({
      id: datasetKiId(name),
      type: 'ontology.dataset',
      title: name,
      attributes: { 'ontology.index': name },
      references: cites(sourceId),
    });
    const client = mockClient([dataset('old', SOURCE_ID), dataset('theirs', 'other')]);

    expect((await run(client)).stale).toEqual([datasetKiId('old')]);

    client.resolveIndex.mockRejectedValueOnce(new Error('cluster unavailable'));
    const failed = await run(client);
    expect(failed.stale).toEqual([]);
    expect(failed.source).toEqual(
      expect.objectContaining({ datasets: 0, error: 'cluster unavailable' })
    );
  });

  it('reports a profile query that fails without stopping the others', async () => {
    const client = mockClient();
    client.esql.mockImplementation(async ({ query }: { query: string }) => {
      if (query.includes('COUNT_DISTINCT')) {
        throw new Error('boom');
      }
      return esqlResponse(['row_count'], [[1]]);
    });

    const output = await run(client);

    expect(output.datasets.find(({ name }) => name === 'orders')?.errors).toEqual([
      'distinct counts: boom',
    ]);
  });
});
