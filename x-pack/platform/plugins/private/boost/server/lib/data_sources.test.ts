/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SAMPLE_DATA_SIZES_GB, getSampleDataAges } from '../prototype/sample_sizes';
import { getDataSources, resolveDataSource } from './data_sources';
import { BoostRequestError } from './errors';

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 9, 14);

const store = (bytes: number) => ({
  primaries: {
    store: { size_in_bytes: 0, total_data_set_size_in_bytes: bytes, reserved_in_bytes: 0 },
  },
});

const dataStream = (
  name: string,
  indexNames: string[],
  lifecycle?: estypes.IndicesDataStream['lifecycle']
): estypes.IndicesDataStream => ({
  name,
  lifecycle,
  indices: indexNames.map((indexName) => ({ index_name: indexName, index_uuid: indexName })),
  generation: indexNames.length,
  hidden: false,
  next_generation_managed_by: 'Data stream lifecycle',
  prefer_ilm: false,
  rollover_on_write: false,
  settings: {},
  status: 'green',
  template: name,
  timestamp_field: { name: '@timestamp' },
});

const createClient = ({ hasLifecycle = true } = {}) => {
  const client = elasticsearchServiceMock.createElasticsearchClient();
  client.indices.resolveIndex.mockResolvedValue({
    indices: [
      { name: 'products-live', attributes: ['open'] },
      { name: '.ds-logs-app-000001', attributes: ['open', 'hidden'], data_stream: 'logs-app' },
    ],
    aliases: [],
    data_streams: [
      { name: 'logs-app', backing_indices: [], timestamp_field: '@timestamp' },
      { name: 'logs-checkout-default', backing_indices: [], timestamp_field: '@timestamp' },
    ],
  });
  client.indices.stats.mockResolvedValue({
    _shards: { total: 1, successful: 1, failed: 0 },
    _all: {},
    indices: {
      'products-live': store(5e9),
      '.ds-logs-app-000001': store(30e9),
      '.ds-logs-app-000002': store(10e9),
    },
  });
  client.indices.getDataStream.mockResolvedValue({
    data_streams: [
      // The project's maximum retention caps the data stream's own.
      dataStream('logs-app', ['.ds-logs-app-000001', '.ds-logs-app-000002'], {
        enabled: true,
        data_retention: '90d',
        effective_retention: '30d',
      }),
      dataStream('logs-checkout-default', [], { enabled: true }),
    ],
  });
  if (hasLifecycle) {
    client.indices.explainDataLifecycle.mockResolvedValue({
      indices: {
        '.ds-logs-app-000001': {
          index: '.ds-logs-app-000001',
          managed_by_lifecycle: true,
          rollover_date_millis: NOW - 72 * HOUR,
        },
        '.ds-logs-app-000002': { index: '.ds-logs-app-000002', managed_by_lifecycle: true },
      },
    });
  } else {
    client.indices.explainDataLifecycle.mockRejectedValue(new Error('unsupported'));
  }
  return client;
};

describe('getDataSources', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
  afterEach(() => jest.restoreAllMocks());

  it("reads a data stream's lifecycle and breaks its data down by each backing index's age", async () => {
    const dataSources = await getDataSources(createClient());

    expect(dataSources.find(({ name }) => name === 'logs-app')).toEqual({
      name: 'logs-app',
      type: 'data_stream',
      size_in_bytes: 40e9,
      lifecycle: { enabled: true, data_retention: '30d' },
      data_ages: [
        // Rolled over three days ago.
        { age_hours: 72, size_in_bytes: 30e9 },
        // The write index, whose newest data is current.
        { age_hours: 0, size_in_bytes: 10e9 },
      ],
    });
    expect(dataSources.find(({ name }) => name === 'products-live')).toEqual({
      name: 'products-live',
      type: 'index',
      size_in_bytes: 5e9,
    });
  });

  it('lists hidden indices and data streams, marked as hidden, but not system ones, as Elasticsearch boosts them', async () => {
    const client = createClient();
    client.indices.resolveIndex.mockResolvedValue({
      indices: [
        { name: '.cases', attributes: ['open', 'hidden'] },
        { name: '.kibana_1', attributes: ['open', 'hidden', 'system'] },
        {
          name: '.ds-.alert-actions-000001',
          attributes: ['open', 'hidden'],
          data_stream: '.alert-actions',
        },
        {
          name: '.ds-.fleet-actions-results-000001',
          attributes: ['open', 'hidden', 'system'],
          data_stream: '.fleet-actions-results',
        },
      ],
      aliases: [],
      data_streams: [
        { name: '.alert-actions', backing_indices: [], timestamp_field: '@timestamp' },
        { name: '.fleet-actions-results', backing_indices: [], timestamp_field: '@timestamp' },
      ],
    });
    client.indices.getDataStream.mockResolvedValue({
      data_streams: [
        { ...dataStream('.alert-actions', ['.ds-.alert-actions-000001']), hidden: true },
      ],
    });

    const dataSources = await getDataSources(client);

    expect(dataSources.map(({ name, type, hidden }) => ({ name, type, hidden }))).toEqual([
      { name: '.alert-actions', type: 'data_stream', hidden: true },
      { name: '.cases', type: 'index', hidden: true },
    ]);
  });

  it('counts backing indices as new when their lifecycle is unavailable', async () => {
    const dataSources = await getDataSources(createClient({ hasLifecycle: false }));

    expect(dataSources.find(({ name }) => name === 'logs-app')?.data_ages).toEqual([
      { age_hours: 0, size_in_bytes: 30e9 },
      { age_hours: 0, size_in_bytes: 10e9 },
    ]);
  });

  it('gives sample data streams an illustrative history', async () => {
    const dataSources = await getDataSources(createClient());
    const sampleBytes = SAMPLE_DATA_SIZES_GB['logs-checkout-default'] * 1e9;

    expect(dataSources.find(({ name }) => name === 'logs-checkout-default')).toEqual({
      name: 'logs-checkout-default',
      type: 'data_stream',
      size_in_bytes: expect.closeTo(sampleBytes),
      // A lifecycle without a retention keeps data indefinitely.
      lifecycle: { enabled: true, data_retention: undefined },
      data_ages: getSampleDataAges(sampleBytes),
    });
  });
});

describe('getSampleDataAges', () => {
  it('spreads the size over 90 days, daily for the last 30 and weekly before that', () => {
    const ages = getSampleDataAges(90e9);

    expect(ages.reduce((total, { size_in_bytes: bytes }) => total + bytes, 0)).toBeCloseTo(90e9);
    expect(ages[0]).toEqual({ age_hours: 0, size_in_bytes: 1e9 });
    expect(ages[29]).toEqual({ age_hours: 29 * 24, size_in_bytes: 1e9 });
    expect(ages[30]).toEqual({ age_hours: 30 * 24, size_in_bytes: 7e9 });
    expect(ages[ages.length - 1].age_hours).toBeLessThan(90 * 24);
  });
});

describe('resolveDataSource', () => {
  const createResolvingClient = (resolved: Partial<estypes.IndicesResolveIndexResponse>) => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    client.indices.resolveIndex.mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [],
      ...resolved,
    });
    return client;
  };

  it('resolves an index or a data stream by its name and type', async () => {
    await expect(
      resolveDataSource(
        createResolvingClient({ indices: [{ name: 'products', attributes: ['open'] }] }),
        'products'
      )
    ).resolves.toEqual({ name: 'products', type: 'index' });
    await expect(
      resolveDataSource(
        createResolvingClient({
          data_streams: [{ name: 'logs-app', backing_indices: [], timestamp_field: '@timestamp' }],
        }),
        'logs-app'
      )
    ).resolves.toEqual({ name: 'logs-app', type: 'data_stream' });
  });

  it('resolves a backing index to its data stream, which rules apply to, as Elasticsearch does', async () => {
    const client = createResolvingClient({
      indices: [
        { name: '.ds-logs-app-000001', attributes: ['open', 'hidden'], data_stream: 'logs-app' },
      ],
    });

    await expect(resolveDataSource(client, '.ds-logs-app-000001')).resolves.toEqual({
      name: 'logs-app',
      type: 'data_stream',
    });
  });

  it("leaves system indices unresolved, since Elasticsearch doesn't boost them", async () => {
    const client = createResolvingClient({
      indices: [{ name: '.kibana_1', attributes: ['open', 'hidden', 'system'] }],
    });

    await expect(resolveDataSource(client, '.kibana_1')).resolves.toBeUndefined();
  });

  it('rejects patterns and aliases, and reports names that match nothing as not found', async () => {
    const client = createResolvingClient({
      aliases: [{ name: 'catalogs', indices: ['catalog-fall'] }],
    });

    await expect(resolveDataSource(client, 'logs-*')).rejects.toMatchObject({ statusCode: 400 });
    await expect(resolveDataSource(client, 'catalogs')).rejects.toMatchObject({ statusCode: 400 });

    client.indices.resolveIndex.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 404,
        body: { error: { type: 'index_not_found_exception' } },
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );
    const resolving = resolveDataSource(client, 'missing');
    await expect(resolving).rejects.toBeInstanceOf(BoostRequestError);
    await expect(resolving).rejects.toMatchObject({ statusCode: 404 });
  });
});
