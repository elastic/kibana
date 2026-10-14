/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SAMPLE_DATA_SIZES_GB, getSampleDataAges } from '../prototype/sample_sizes';
import { getDataSources } from './data_sources';

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 9, 14);

const store = (bytes: number) => ({
  primaries: {
    store: { size_in_bytes: 0, total_data_set_size_in_bytes: bytes, reserved_in_bytes: 0 },
  },
});

const dataStream = (name: string, indexNames: string[]): estypes.IndicesDataStream => ({
  name,
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
    data_streams: [dataStream('logs-app', ['.ds-logs-app-000001', '.ds-logs-app-000002'])],
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

  it("breaks a data stream's data down by the age of each backing index", async () => {
    const dataSources = await getDataSources(createClient());

    expect(dataSources.find(({ name }) => name === 'logs-app')).toEqual({
      name: 'logs-app',
      type: 'data_stream',
      size_in_bytes: 40e9,
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
