/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { estypes } from '@elastic/elasticsearch';
import type {
  HousekeepingContext,
  HousekeepingResourceEntry,
} from '@kbn/housekeeping-plugin/server';
import { indexResourceProvider } from './resource_provider';

const setup = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.indices.getIndexTemplate.mockResolvedValue({
    index_templates: [
      {
        name: 'logs-app',
        index_template: {
          index_patterns: ['logs-app-*'],
          composed_of: ['app@settings', 'logs@custom'],
          ignore_missing_component_templates: ['logs@custom'],
          template: {
            settings: { 'index.default_pipeline': 'app-v1', 'index.lifecycle.name': 'app' },
          },
          _meta: { managed: true },
        },
      },
    ],
  } as unknown as estypes.IndicesGetIndexTemplateResponse);
  esClient.cluster.getComponentTemplate.mockResolvedValue({
    component_templates: [
      {
        name: 'app@settings',
        component_template: { template: { settings: { 'index.final_pipeline': '_none' } } },
      },
    ],
  } as unknown as estypes.ClusterGetComponentTemplateResponse);
  esClient.indices.getDataStream.mockResolvedValue({
    data_streams: [
      {
        name: 'logs-app-default',
        template: 'logs-app',
        indices: [{ index_name: '.ds-logs-app-1' }, { index_name: '.ds-logs-app-2' }],
      },
    ],
  } as unknown as estypes.IndicesGetDataStreamResponse);
  esClient.indices.getSettings.mockResolvedValue({
    '.ds-logs-app-1': {
      settings: { 'index.default_pipeline': 'old', 'index.lifecycle.name': 'old-policy' },
    },
    '.ds-logs-app-2': {
      settings: { 'index.default_pipeline': 'app-v1', 'index.lifecycle.name': 'app' },
    },
    orders: { settings: { 'index.default_pipeline': 'orders' } },
  } as unknown as estypes.IndicesGetSettingsResponse);

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

const targets = (resource?: { references?: Array<{ targetType: string; targetId: string }> }) =>
  resource?.references?.map(({ targetType, targetId }) => `${targetType}:${targetId}`);

describe('index management resource provider', () => {
  it('lists templates, data streams and indices with what they reference', async () => {
    const { context } = setup();
    const resources = (await indexResourceProvider.listResources(
      context
    )) as HousekeepingResourceEntry[];
    const byId = (id: string) => resources.find((resource) => resource.id === id);

    expect(byId('logs-app')).toMatchObject({ type: 'index_template', isManaged: true });
    expect(targets(byId('logs-app'))).toEqual([
      'ingest_pipeline:app-v1',
      'ilm_policy:app',
      'component_template:app@settings',
      'component_template:logs@custom',
    ]);
    expect(byId('logs-app')?.references?.at(-1)?.optional).toBe(true);
    expect(targets(byId('app@settings'))).toEqual([]);
    expect(targets(byId('orders'))).toEqual(['ingest_pipeline:orders']);
    expect(byId('orders')).toMatchObject({ type: 'index' });
  });

  it('reports a data stream once, with the pipelines of its write index and every policy', async () => {
    const { context } = setup();
    const resources = (await indexResourceProvider.listResources(
      context
    )) as HousekeepingResourceEntry[];
    const dataStream = resources.find(({ id }) => id === 'logs-app-default');

    expect(resources.some(({ id }) => id.startsWith('.ds-'))).toBe(false);
    expect(dataStream).toMatchObject({ type: 'data_stream', evidence: { backingIndices: 2 } });
    expect(targets(dataStream)).toEqual([
      'ingest_pipeline:app-v1',
      'ilm_policy:old-policy',
      'ilm_policy:app',
      'index_template:logs-app',
    ]);
  });
});
