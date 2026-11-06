/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { HousekeepingContext } from '@kbn/housekeeping-plugin/server';
import {
  closedIndexCheck,
  dataStreamWithoutRecentDataCheck,
  dataStreamWithoutRetentionCheck,
  overshardedIndexCheck,
  readOnlyIndexCheck,
  unassignableReplicasCheck,
} from './checks';

const DAY_MS = 24 * 60 * 60 * 1000;

const dataStream = (name: string, overrides: Record<string, unknown> = {}) => ({
  name,
  indices: [{ index_name: `.ds-${name}-1` }, { index_name: `.ds-${name}-2` }],
  next_generation_managed_by: 'Data stream lifecycle',
  ...overrides,
});

const setup = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.indices.getDataStream.mockResolvedValue({
    data_streams: [
      dataStream('unmanaged', { next_generation_managed_by: 'Unmanaged' }),
      dataStream('dsl-without-retention', { lifecycle: { enabled: true } }),
      dataStream('dsl-with-retention', { lifecycle: { enabled: true, data_retention: '30d' } }),
      dataStream('ilm', { next_generation_managed_by: 'Index Lifecycle Management' }),
    ],
  } as unknown as estypes.IndicesGetDataStreamResponse);

  const context: HousekeepingContext = {
    esClient,
    savedObjectsClient: savedObjectsClientMock.create(),
    isServerless: false,
    abortSignal: new AbortController().signal,
    logger: loggingSystemMock.createLogger(),
    fetchOnce: (_key, fetch) => fetch(new AbortController().signal),
  };
  return { esClient, context };
};

const ids = (findings: Array<{ resource: { type: string; id: string } }>) =>
  findings.map(({ resource }) => `${resource.type}:${resource.id}`);

describe('index management housekeeping checks', () => {
  it('reports data streams that nothing deletes data from', async () => {
    const { context } = setup();

    expect(ids(await dataStreamWithoutRetentionCheck.run(context))).toEqual([
      'data_stream:unmanaged',
      'data_stream:dsl-without-retention',
    ]);
  });

  it('reports data streams without recent documents, including empty ones', async () => {
    const { esClient, context } = setup();
    esClient.indices.dataStreamsStats.mockResolvedValue({
      data_streams: [
        { data_stream: 'unmanaged', maximum_timestamp: Date.now() - 45 * DAY_MS },
        { data_stream: 'ilm', maximum_timestamp: Date.now() - DAY_MS },
        { data_stream: 'dsl-without-retention', maximum_timestamp: 0 },
      ],
    } as unknown as estypes.IndicesDataStreamsStatsResponse);

    const findings = await dataStreamWithoutRecentDataCheck.run(context);

    expect(findings.map(({ resource, details }) => [resource.id, details])).toEqual([
      ['unmanaged', ['Last document 45 days ago']],
      ['dsl-without-retention', ['No documents']],
    ]);
  });

  it('reports closed indices once per data stream', async () => {
    const { esClient, context } = setup();
    esClient.cat.indices.mockResolvedValue([
      { index: '.ds-ilm-1', status: 'close' },
      { index: '.ds-ilm-2', status: 'close' },
      { index: 'archive', status: 'close' },
      { index: 'open-one', status: 'open' },
    ]);

    const findings = await closedIndexCheck.run(context);

    expect(ids(findings)).toEqual(['data_stream:ilm', 'index:archive']);
    expect(findings.map(({ fix }) => fix?.request)).toEqual([undefined, 'DELETE archive']);
  });

  it('reports indices blocked after the disk filled up', async () => {
    const { esClient, context } = setup();
    esClient.indices.getSettings.mockResolvedValue({
      blocked: { settings: { 'index.blocks.read_only_allow_delete': 'true' } },
      fine: { settings: {} },
    } as unknown as estypes.IndicesGetSettingsResponse);

    expect(ids(await readOnlyIndexCheck.run(context))).toEqual(['index:blocked']);
  });

  it('reports replicas the data nodes cannot hold, unless they auto expand', async () => {
    const { esClient, context } = setup();
    esClient.indices.getSettings.mockResolvedValue({
      one_replica: { settings: { 'index.number_of_replicas': '1' } },
      no_replicas: { settings: { 'index.number_of_replicas': '0' } },
      auto: {
        settings: { 'index.number_of_replicas': '1', 'index.auto_expand_replicas': '0-1' },
      },
    } as unknown as estypes.IndicesGetSettingsResponse);
    esClient.cluster.health.mockResolvedValue({
      number_of_data_nodes: 1,
    } as unknown as estypes.ClusterHealthResponse);

    const findings = await unassignableReplicasCheck.run(context);

    expect(findings.map(({ resource, details }) => [resource.id, details])).toEqual([
      ['one_replica', ['1 replica, 1 data node']],
    ]);
    expect(findings[0].fix?.request).toBe(
      'PUT one_replica/_settings\n{\n  "index.number_of_replicas": 0\n}'
    );
  });

  it('reports indices that split little data across several primary shards', async () => {
    const { esClient, context } = setup();
    esClient.cat.indices.mockResolvedValue([
      { index: 'tiny', status: 'open', pri: '3', 'pri.store.size': '2048' },
      { index: 'big', status: 'open', pri: '3', 'pri.store.size': String(30 * 1024 ** 3) },
      { index: 'single', status: 'open', pri: '1', 'pri.store.size': '10' },
    ]);

    const findings = await overshardedIndexCheck.run(context);

    expect(findings.map(({ resource, details }) => [resource.id, details])).toEqual([
      ['tiny', ['3 primary shards for 2 KB']],
    ]);
  });
});
