/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, coreMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  Collector,
  createUsageCollectionSetupMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { createCollectorFetchContextMock } from '@kbn/usage-collection-plugin/server/mocks';
import { registerInferenceConnectorsUsageCollector } from './inference_connectors_usage_collector';

beforeEach(() => jest.resetAllMocks());

describe('inference_connectors_usage_collector', () => {
  let collector: Collector<unknown>;
  const logger = loggingSystemMock.createLogger();
  const mockedFetchContext = createCollectorFetchContextMock();

  it('registers collector with the usageCollection service', async () => {
    const usageCollectionMock = createUsageCollectionSetupMock();
    usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
      collector = new Collector(logger, config);
      return createUsageCollectionSetupMock().makeUsageCollector(config);
    });

    const core = coreMock.createSetup();
    registerInferenceConnectorsUsageCollector(usageCollectionMock, core);

    expect(collector!).toBeDefined();
  });

  describe('isReady', () => {
    it('returns true (no async readiness requirements)', () => {
      const usageCollectionMock = createUsageCollectionSetupMock();
      usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
        collector = new Collector(logger, config);
        return createUsageCollectionSetupMock().makeUsageCollector(config);
      });
      const core = coreMock.createSetup();
      registerInferenceConnectorsUsageCollector(usageCollectionMock, core);

      expect(collector.isReady()).toBe(true);
    });
  });

  describe('fetch', () => {
    it('calls ES search and returns usage data', async () => {
      const usageCollectionMock = createUsageCollectionSetupMock();
      usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
        collector = new Collector(logger, config);
        return createUsageCollectionSetupMock().makeUsageCollector(config);
      });

      const core = coreMock.createSetup();
      const [coreStart] = await core.getStartServices();
      const esClient = coreStart.elasticsearch.client
        .asInternalUser as unknown as jest.Mocked<ElasticsearchClient>;
      (coreStart.savedObjects.getIndexForType as unknown as jest.Mock).mockReturnValue('.kibana_1');

      // @ts-expect-error Partial SearchResponse shape for test
      esClient.search.mockResolvedValueOnce({
        aggregations: {
          byProvider: {
            buckets: [
              { key: 'openai', doc_count: 3 },
              { key: 'azureopenai', doc_count: 1 },
            ],
          },
        },
      });

      registerInferenceConnectorsUsageCollector(usageCollectionMock, core);

      const result = await collector.fetch(mockedFetchContext);

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        inference_count_by_provider: { openai: 3, azureopenai: 1 },
      });
    });

    it('returns empty usage on ES error', async () => {
      const usageCollectionMock = createUsageCollectionSetupMock();
      usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
        collector = new Collector(logger, config);
        return createUsageCollectionSetupMock().makeUsageCollector(config);
      });

      const core = coreMock.createSetup();
      const [coreStart] = await core.getStartServices();
      const esClient = coreStart.elasticsearch.client
        .asInternalUser as unknown as jest.Mocked<ElasticsearchClient>;
      (coreStart.savedObjects.getIndexForType as unknown as jest.Mock).mockReturnValue('.kibana_1');

      esClient.search.mockRejectedValueOnce(new Error('boom'));

      registerInferenceConnectorsUsageCollector(usageCollectionMock, core);

      const result = await collector.fetch(mockedFetchContext);

      expect(result).toEqual({ inference_count_by_provider: {} });
    });
  });
});
