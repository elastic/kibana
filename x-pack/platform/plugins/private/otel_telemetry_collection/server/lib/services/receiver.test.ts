/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { OtelTelemetryReceiver } from './receiver';
import { SIGNAL_INDICES, DEFAULT_OTEL_TELEMETRY_CONFIGURATION } from '../constants';
import type { OtelTelemetryConfiguration } from '../constants';

const defaultConfig: OtelTelemetryConfiguration = DEFAULT_OTEL_TELEMETRY_CONFIGURATION;

describe('OtelTelemetryReceiver', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let esClient: jest.Mocked<ElasticsearchClient>;
  let receiver: OtelTelemetryReceiver;

  const makeCompositeResponse = (
    buckets: Array<{ key: { service_name: string; environment: string | null } }>,
    afterKey?: Record<string, unknown>
  ) => ({
    aggregations: {
      combos: {
        buckets: buckets.map((b) => ({
          ...b,
          doc_count: 100,
          sample: {
            sdk_names: { buckets: [] },
            sdk_languages: { buckets: [] },
            sdk_versions: { buckets: [] },
            distro_names: { buckets: [] },
            distro_versions: { buckets: [] },
            cloud_providers: { buckets: [] },
            cloud_platforms: { buckets: [] },
            cloud_regions: { buckets: [] },
            cloud_az: { buckets: [] },
            host_archs: { buckets: [] },
            os_types: { buckets: [] },
            os_names: { buckets: [] },
            os_versions: { buckets: [] },
            os_descriptions: { buckets: [] },
            device_manufacturers: { buckets: [] },
            device_model_names: { buckets: [] },
            browser_platforms: { buckets: [] },
            user_agent_originals: { buckets: [] },
            runtime_names: { buckets: [] },
            runtime_versions: { buckets: [] },
            runtime_descriptions: { buckets: [] },
            executable_names: { buckets: [] },
            webengine_names: { buckets: [] },
            webengine_versions: { buckets: [] },
            webengine_descriptions: { buckets: [] },
            scope_names: { buckets: [] },
            upstream_cluster: { buckets: [] },
          },
          has_k8s: { doc_count: 0 },
          has_container: { doc_count: 0 },
        })),
        ...(afterKey ? { after_key: afterKey } : {}),
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    esClient = {
      search: jest.fn(),
    } as unknown as jest.Mocked<ElasticsearchClient>;
    receiver = new OtelTelemetryReceiver(logger, esClient);
  });

  describe('buildCompositeQuery', () => {
    it('should produce a query with correct structure using config values', async () => {
      (esClient.search as jest.Mock).mockResolvedValue(makeCompositeResponse([]));

      await receiver.fetchAllSignals(defaultConfig);

      const call = (esClient.search as jest.Mock).mock.calls[0][0];

      expect(call.size).toBe(0);
      expect(call.timeout).toBe(defaultConfig.query_timeout);
      expect(call.track_total_hits).toBe(false);
      expect(call.query.bool.filter).toEqual([
        { range: { '@timestamp': { gte: `now-${defaultConfig.query_window}` } } },
      ]);
      expect(call.query.bool.must_not).toEqual([
        { wildcard: { 'data_stream.dataset': '*.1m.otel' } },
        { wildcard: { 'data_stream.dataset': '*.10m.otel' } },
        { wildcard: { 'data_stream.dataset': '*.60m.otel' } },
      ]);

      const composite = call.aggs.combos.composite;
      expect(composite.size).toBe(defaultConfig.composite_page_size);
      expect(composite.sources).toHaveLength(2);
      expect(composite.sources[0]).toEqual({
        service_name: { terms: { field: 'service.name' } },
      });
      expect(composite.sources[1]).toEqual({
        environment: {
          terms: {
            field: 'resource.attributes.deployment.environment',
            missing_bucket: true,
          },
        },
      });
    });

    it('should include all expected sub-aggregations', async () => {
      (esClient.search as jest.Mock).mockResolvedValue(makeCompositeResponse([]));

      await receiver.fetchAllSignals(defaultConfig);

      const comboAggs = (esClient.search as jest.Mock).mock.calls[0][0].aggs.combos.aggs;
      const sampleAggs = comboAggs.sample.aggs;

      const expectedTermsAggs = [
        'sdk_names',
        'sdk_languages',
        'sdk_versions',
        'distro_names',
        'distro_versions',
        'cloud_providers',
        'cloud_platforms',
        'cloud_regions',
        'cloud_az',
        'host_archs',
        'os_types',
        'os_names',
        'os_versions',
        'os_descriptions',
        'device_manufacturers',
        'device_model_names',
        'browser_platforms',
        'user_agent_originals',
        'runtime_names',
        'runtime_versions',
        'runtime_descriptions',
        'executable_names',
        'webengine_names',
        'webengine_versions',
        'webengine_descriptions',
        'scope_names',
      ];

      for (const aggName of expectedTermsAggs) {
        expect(sampleAggs[aggName]).toBeDefined();
        expect(sampleAggs[aggName].terms).toBeDefined();
      }

      expect(comboAggs.has_k8s.filter).toBeDefined();
      expect(comboAggs.has_container.filter).toBeDefined();
    });

    it('should use hardcoded agg sizes (5 for terms, 100 for scope_names)', async () => {
      (esClient.search as jest.Mock).mockResolvedValue(makeCompositeResponse([]));

      await receiver.fetchAllSignals(defaultConfig);

      const sampleAggs = (esClient.search as jest.Mock).mock.calls[0][0].aggs.combos.aggs.sample
        .aggs;
      expect(sampleAggs.scope_names.terms.size).toBe(100);
      expect(sampleAggs.sdk_names.terms.size).toBe(5);
    });
  });

  describe('fetchAllSignals', () => {
    it('should query all three signal index patterns', async () => {
      (esClient.search as jest.Mock).mockResolvedValue(makeCompositeResponse([]));

      await receiver.fetchAllSignals(defaultConfig);

      expect(esClient.search).toHaveBeenCalledTimes(3);

      const indices = (esClient.search as jest.Mock).mock.calls.map(
        (call: [{ index: string }]) => call[0].index
      );
      expect(indices).toEqual([SIGNAL_INDICES.traces, SIGNAL_INDICES.metrics, SIGNAL_INDICES.logs]);
    });

    it('should return buckets grouped by signal', async () => {
      const tracesBucket = { key: { service_name: 'svc-a', environment: null } };
      const metricsBucket = { key: { service_name: 'svc-b', environment: null } };

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce(makeCompositeResponse([tracesBucket]))
        .mockResolvedValueOnce(makeCompositeResponse([metricsBucket]))
        .mockResolvedValueOnce(makeCompositeResponse([]));

      const result = await receiver.fetchAllSignals(defaultConfig);

      expect(result.traces).toHaveLength(1);
      expect(result.traces[0].key.service_name).toBe('svc-a');
      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].key.service_name).toBe('svc-b');
      expect(result.logs).toHaveLength(0);
    });

    it('should handle per-signal errors gracefully', async () => {
      (esClient.search as jest.Mock)
        .mockRejectedValueOnce(new Error('traces timeout'))
        .mockResolvedValueOnce(
          makeCompositeResponse([{ key: { service_name: 'svc', environment: null } }])
        )
        .mockResolvedValueOnce(makeCompositeResponse([]));

      const result = await receiver.fetchAllSignals(defaultConfig);

      expect(result.traces).toEqual([]);
      expect(result.metrics).toHaveLength(1);
      expect(result.logs).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch traces signal, using empty result',
        expect.any(Object)
      );
    });
  });

  describe('pagination', () => {
    it('should paginate using after_key', async () => {
      const page1 = Array.from({ length: defaultConfig.composite_page_size }, (_, i) => ({
        key: { service_name: `svc-${i}`, environment: null },
      }));

      const page2 = [{ key: { service_name: 'svc-last', environment: null } }];

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce(
          makeCompositeResponse(page1, { service_name: 'svc-999', environment: null })
        )
        .mockResolvedValueOnce(makeCompositeResponse(page2))
        .mockResolvedValue(makeCompositeResponse([]));

      const result = await receiver.fetchAllSignals(defaultConfig);

      expect(result.traces).toHaveLength(defaultConfig.composite_page_size + 1);

      const secondCall = (esClient.search as jest.Mock).mock.calls[1][0];
      expect(secondCall.aggs.combos.composite.after).toEqual({
        service_name: 'svc-999',
        environment: null,
      });
    });

    it('should collect all pages when under max_total_buckets', async () => {
      const pageSize = defaultConfig.composite_page_size;
      const largePage = Array.from({ length: pageSize }, (_, i) => ({
        key: { service_name: `svc-${i}`, environment: null },
      }));
      const lastPage = [{ key: { service_name: 'svc-final', environment: null } }];

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce(
          makeCompositeResponse(largePage, { service_name: 'after-1', environment: null })
        )
        .mockResolvedValueOnce(
          makeCompositeResponse(largePage, { service_name: 'after-2', environment: null })
        )
        .mockResolvedValueOnce(
          makeCompositeResponse(largePage, { service_name: 'after-3', environment: null })
        )
        .mockResolvedValueOnce(
          makeCompositeResponse(largePage, { service_name: 'after-4', environment: null })
        )
        .mockResolvedValueOnce(
          makeCompositeResponse(largePage, { service_name: 'after-5', environment: null })
        )
        .mockResolvedValueOnce(makeCompositeResponse(lastPage))
        .mockResolvedValue(makeCompositeResponse([]));

      const result = await receiver.fetchAllSignals(defaultConfig);

      expect(result.traces).toHaveLength(5 * pageSize + 1);
    });

    it('should truncate at max_total_buckets and log a warning', async () => {
      const config = { ...defaultConfig, max_total_buckets: 2500 };
      const pageSize = config.composite_page_size;
      const largePage = Array.from({ length: pageSize }, (_, i) => ({
        key: { service_name: `svc-${i}`, environment: null },
      }));

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce(
          makeCompositeResponse(largePage, { service_name: 'after-1', environment: null })
        )
        .mockResolvedValueOnce(
          makeCompositeResponse(largePage, { service_name: 'after-2', environment: null })
        )
        .mockResolvedValueOnce(
          makeCompositeResponse(largePage, { service_name: 'after-3', environment: null })
        )
        .mockResolvedValueOnce(
          makeCompositeResponse(largePage, { service_name: 'after-4', environment: null })
        )
        .mockResolvedValue(makeCompositeResponse([]));

      const result = await receiver.fetchAllSignals(config);

      expect(result.traces).toHaveLength(3 * pageSize);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('max_total_buckets'),
        expect.any(Object)
      );
    });
  });
});
