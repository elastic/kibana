/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { Feature, StreamQuery } from '@kbn/significant-events-schema';
import type { COMPUTED_FEATURE_TYPES } from '@kbn/significant-events-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { StreamsClient } from '@kbn/streams-plugin/server';
import type { KnowledgeIndicatorClient } from '../../../lib/knowledge_indicators';
import {
  searchKnowledgeIndicatorsToolHandler,
  type CompactFeature,
  type StrippedFeatureKeys,
} from './handler';

const STRIPPED_FEATURE_KEYS = [
  'uuid',
  'run_id',
  'updated_at',
  'expires_at',
  'confidence',
  'evidence_doc_ids',
] as const satisfies readonly StrippedFeatureKeys[];

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'feature-id',
    uuid: 'feature-uuid',
    run_id: 'run-id',
    updated_at: '2026-01-01T00:00:00Z',
    expires_at: '2026-02-01T00:00:00Z',
    stream_name: 'logs.test',
    type: 'dataset_analysis',
    description: 'Feature description',
    properties: {},
    confidence: 90,
    evidence_doc_ids: ['doc-1'],
    ...overrides,
  };
}

function makeStreamQuery(overrides: Partial<StreamQuery> = {}): StreamQuery {
  return {
    id: 'query-id',
    type: 'match',
    title: 'Query title',
    description: 'Query description',
    esql: { query: 'FROM logs-*' },
    ...overrides,
  };
}

describe('searchKnowledgeIndicatorsToolHandler', () => {
  const logger = loggingSystemMock.createLogger();

  const streamsClient = {
    listStreams: jest.fn(),
  } as unknown as StreamsClient;

  const kiClient = {
    getFeatures: jest.fn(),
    findFeatures: jest.fn(),
    findQueries: jest.fn(),
    getQueryLinks: jest.fn(),
  } as unknown as KnowledgeIndicatorClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns both features and queries when kind is omitted', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([{ name: 'logs.test' } as Streams.all.Definition]);

    kiClient.getFeatures = jest
      .fn()
      .mockResolvedValue({ hits: [makeFeature({ id: 'f1', confidence: 80 })], total: 1 });

    kiClient.getQueryLinks = jest.fn().mockResolvedValue([
      {
        'asset.uuid': 'a1',
        'asset.type': 'query',
        'asset.id': 'q1',
        stream_name: 'logs.test',
        rule_backed: true,
        rule_id: 'rule-1',
        query: makeStreamQuery({ id: 'q1', severity_score: 75 }),
      },
    ]);

    const result = await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      kiClient,
      logger,
      params: {},
      view: 'compact',
    });

    expect(result.knowledge_indicators).toHaveLength(2);
    expect(result.knowledge_indicators[0].kind).toBe('feature');
    expect(result.knowledge_indicators[1].kind).toBe('query');
  });

  it('returns only queries when kind is [query] and does not call kiClient.getFeatures', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([{ name: 'logs.test' } as Streams.all.Definition]);

    kiClient.getQueryLinks = jest.fn().mockResolvedValue([
      {
        'asset.uuid': 'a1',
        'asset.type': 'query',
        'asset.id': 'q1',
        stream_name: 'logs.test',
        rule_backed: false,
        rule_id: 'rule-1',
        query: makeStreamQuery({ id: 'q1' }),
      },
    ]);

    const result = await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      kiClient,
      logger,
      params: { kind: ['query'] },
      view: 'compact',
    });

    expect(kiClient.getFeatures).not.toHaveBeenCalled();
    expect(result.knowledge_indicators).toEqual([
      {
        kind: 'query',
        query: {
          id: 'q1',
          type: 'match',
          title: 'Query title',
          description: 'Query description',
          esql: { query: 'FROM logs-*' },
        },
        rule: {
          backed: false,
          id: 'rule-1',
        },
        stream_name: 'logs.test',
      },
    ]);
  });

  it('uses findQueries when search_text is provided', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([{ name: 'logs.test' } as Streams.all.Definition]);

    kiClient.findQueries = jest.fn().mockResolvedValue([]);

    await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      kiClient,
      logger,
      params: {
        kind: ['query'],
        search_text: 'payment',
        query_types: ['match'],
        rule_ids: ['rule-1'],
        rule_backed: true,
      },
      view: 'compact',
    });

    expect(kiClient.findQueries).toHaveBeenCalledWith(['logs.test'], 'payment', {
      ruleUnbacked: 'exclude',
      queryTypes: ['match'],
      queryIds: undefined,
      ruleIds: ['rule-1'],
    });
    expect(kiClient.getQueryLinks).not.toHaveBeenCalled();
  });

  it('passes feature filters to semantic search', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([{ name: 'logs.test' } as Streams.all.Definition]);
    kiClient.findFeatures = jest.fn().mockResolvedValue({ hits: [] });

    await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      kiClient,
      logger,
      params: {
        kind: ['feature'],
        search_text: 'payment',
        feature_types: ['dependency'],
        feature_ids: ['payments-api'],
      },
      view: 'compact',
    });

    expect(kiClient.findFeatures).toHaveBeenCalledWith('logs.test', 'payment', {
      featureTypes: ['dependency'],
      featureIds: ['payments-api'],
    });
    expect(kiClient.getFeatures).not.toHaveBeenCalled();
  });

  it('loads topology candidates in one feature search', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([{ name: 'logs.test' } as Streams.all.Definition]);
    kiClient.getFeatures = jest
      .fn()
      .mockImplementation(
        async (_stream: string, options: { type?: string[]; featureIds?: string[] }) => {
          if (options.type?.includes('dependency') && !options.featureIds) {
            return {
              hits: [
                makeFeature({
                  id: 'orders-api-storage',
                  type: 'dependency',
                  properties: {
                    source: 'orders-api',
                    target: 'storage',
                    protocol: 'tcp',
                  },
                }),
              ],
              total: 1,
            };
          }
          return { hits: [], total: 0 };
        }
      );

    const result = await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      kiClient,
      logger,
      params: {
        kind: ['feature'],
        feature_types: ['dependency'],
        feature_ids: ['orders-api'],
      },
      view: 'compact',
    });

    expect(result.knowledge_indicators).toEqual([
      expect.objectContaining({
        kind: 'feature',
        feature: expect.objectContaining({ id: 'orders-api-storage' }),
      }),
    ]);
    expect(kiClient.getFeatures).toHaveBeenCalledWith('logs.test', {
      type: ['dependency'],
    });
  });

  it('filters requested streamNames against accessible streams', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([{ name: 'logs.allowed' } as Streams.all.Definition]);

    kiClient.getFeatures = jest.fn().mockResolvedValue({ hits: [], total: 0 });
    kiClient.getQueryLinks = jest.fn().mockResolvedValue([]);

    await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      kiClient,
      logger,
      params: { stream_names: ['logs.allowed', 'logs.not_allowed'] },
      view: 'compact',
    });

    expect(kiClient.getFeatures).toHaveBeenCalledTimes(1);
    expect(kiClient.getFeatures).toHaveBeenCalledWith('logs.allowed', expect.any(Object));
    expect(kiClient.getQueryLinks).toHaveBeenCalledWith(
      ['logs.allowed'],
      expect.objectContaining({ ruleUnbacked: 'include' })
    );
  });

  it('passes feature and rule-backed query filters to the client', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([{ name: 'logs.test' } as Streams.all.Definition]);
    kiClient.getFeatures = jest.fn().mockResolvedValue({ hits: [], total: 0 });
    kiClient.getQueryLinks = jest.fn().mockResolvedValue([]);

    const result = await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      kiClient,
      logger,
      params: {
        feature_types: ['dependency', 'entity'],
        feature_ids: ['service-a'],
        query_types: ['match'],
        query_ids: ['query-1'],
        rule_ids: ['rule-1'],
        rule_backed: true,
        page: 2,
        per_page: 25,
      },
      view: 'compact',
    });

    expect(kiClient.getFeatures).toHaveBeenCalledWith('logs.test', {
      type: ['dependency', 'entity'],
    });
    expect(kiClient.getQueryLinks).toHaveBeenCalledWith(['logs.test'], {
      ruleUnbacked: 'exclude',
      queryTypes: ['match'],
      queryIds: ['query-1'],
      ruleIds: ['rule-1'],
    });
    expect(result).toMatchObject({ page: 2, per_page: 25, total: 0 });
  });

  it('logs a debug message when feature retrieval fails for a stream', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([
        { name: 'logs.bad' } as Streams.all.Definition,
        { name: 'logs.good' } as Streams.all.Definition,
      ]);

    kiClient.getFeatures = jest.fn().mockImplementation((streamName: string) => {
      if (streamName === 'logs.bad') {
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve({ hits: [makeFeature({ id: 'ok' })], total: 1 });
    });

    kiClient.getQueryLinks = jest.fn().mockResolvedValue([]);

    await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      kiClient,
      logger,
      params: { kind: ['feature'] },
      view: 'compact',
    });

    expect(logger.warn).toHaveBeenCalled();
  });

  describe('compact view', () => {
    function setupFeatureStream(feature: Feature) {
      streamsClient.listStreams = jest
        .fn()
        .mockResolvedValue([{ name: 'logs.test' } as Streams.all.Definition]);
      kiClient.getFeatures = jest.fn().mockResolvedValue({ hits: [feature], total: 1 });
      kiClient.getQueryLinks = jest.fn().mockResolvedValue([]);
    }

    async function getCompactFeature(feature: Feature): Promise<CompactFeature> {
      setupFeatureStream(feature);
      const result = await searchKnowledgeIndicatorsToolHandler({
        streamsClient,
        kiClient,
        logger,
        params: { kind: ['feature'] },
        view: 'compact',
      });
      if (result.view !== 'compact') throw new Error('Expected compact view');
      const ki = result.knowledge_indicators[0];
      if (ki.kind !== 'feature') throw new Error('Expected feature KI');
      return ki.feature;
    }

    it('strips StrippedFeatureKeys from feature KIs', async () => {
      const feature = await getCompactFeature(makeFeature({ type: 'entity' }));
      for (const key of STRIPPED_FEATURE_KEYS) {
        expect(feature).not.toHaveProperty(key);
      }
      expect(feature.id).toBe('feature-id');
      expect(feature.type).toBe('entity');
    });

    it('truncates dataset_analysis to field_names (≤10), fields_count, truncated', async () => {
      const fields: Record<string, unknown> = Object.fromEntries(
        Array.from({ length: 15 }, (_, i) => [`field_${i}`, { type: 'keyword' }])
      );
      const feature = await getCompactFeature(
        makeFeature({
          type: 'dataset_analysis',
          properties: { analysis: { total: 1000, sampled: 100, fields } },
        })
      );
      const analysis = (feature.properties as { analysis: Record<string, unknown> }).analysis;
      expect((analysis.field_names as string[]).length).toBeLessThanOrEqual(10);
      expect(analysis.fields_count).toBe(15);
      expect(analysis.truncated).toBe(true);
    });

    it.each(['error_logs', 'log_samples'] as const satisfies ReadonlyArray<
      (typeof COMPUTED_FEATURE_TYPES)[number]
    >)('truncates %s to 1 sample with samples_count and truncated', async (type) => {
      const samples = [{ msg: 'a' }, { msg: 'b' }, { msg: 'c' }];
      const feature = await getCompactFeature(makeFeature({ type, properties: { samples } }));
      expect(feature.properties).toEqual({
        samples: [{ msg: 'a' }],
        samples_count: 3,
        truncated: true,
      });
    });

    it('truncates log_patterns to 1 pattern with patterns_count and truncated', async () => {
      const patterns = [{ pattern: 'p1' }, { pattern: 'p2' }, { pattern: 'p3' }];
      const feature = await getCompactFeature(
        makeFeature({ type: 'log_patterns', properties: { patterns } })
      );
      expect(feature.properties).toEqual({
        patterns: [{ pattern: 'p1' }],
        patterns_count: 3,
        truncated: true,
      });
    });

    it('truncates evidence to MAX_FEATURE_ARRAY_ITEMS and sets evidence_count', async () => {
      const evidence = Array.from({ length: 15 }, (_, i) => `evidence item ${i}`);
      const feature = await getCompactFeature(makeFeature({ type: 'entity', evidence }));
      expect(feature.evidence).toHaveLength(10);
      expect(feature.evidence_count).toBe(15);
    });

    it('truncates tags to MAX_FEATURE_ARRAY_ITEMS and sets tags_count', async () => {
      const tags = Array.from({ length: 15 }, (_, i) => `tag-${i}`);
      const feature = await getCompactFeature(makeFeature({ type: 'entity', tags }));
      expect(feature.tags).toHaveLength(10);
      expect(feature.tags_count).toBe(15);
    });

    it('does not set evidence_count when evidence is exactly MAX_FEATURE_ARRAY_ITEMS', async () => {
      const evidence = Array.from({ length: 10 }, (_, i) => `evidence item ${i}`);
      const feature = await getCompactFeature(makeFeature({ type: 'entity', evidence }));
      expect(feature.evidence).toHaveLength(10);
      expect(feature).not.toHaveProperty('evidence_count');
    });

    it('does not set evidence_count when evidence has fewer than MAX_FEATURE_ARRAY_ITEMS', async () => {
      const evidence = Array.from({ length: 5 }, (_, i) => `evidence item ${i}`);
      const feature = await getCompactFeature(makeFeature({ type: 'entity', evidence }));
      expect(feature.evidence).toHaveLength(5);
      expect(feature).not.toHaveProperty('evidence_count');
    });

    it('does not set tags_count when tags is exactly MAX_FEATURE_ARRAY_ITEMS', async () => {
      const tags = Array.from({ length: 10 }, (_, i) => `tag-${i}`);
      const feature = await getCompactFeature(makeFeature({ type: 'entity', tags }));
      expect(feature.tags).toHaveLength(10);
      expect(feature).not.toHaveProperty('tags_count');
    });

    it('does not set tags_count when tags has fewer than MAX_FEATURE_ARRAY_ITEMS', async () => {
      const tags = Array.from({ length: 5 }, (_, i) => `tag-${i}`);
      const feature = await getCompactFeature(makeFeature({ type: 'entity', tags }));
      expect(feature.tags).toHaveLength(5);
      expect(feature).not.toHaveProperty('tags_count');
    });

    it('samples array-valued meta keys to MAX_COMPACT_META_ARRAY_SAMPLE and preserves scalars', async () => {
      const meta = {
        observed_clusters: Array.from({ length: 15 }, (_, i) => `cluster-${i}`),
        observed_regions: Array.from({ length: 12 }, (_, i) => `region-${i}`),
        runtime: 'containerd',
        version: '0.41.0',
      };
      const feature = await getCompactFeature(makeFeature({ type: 'entity', meta }));
      expect(feature.meta?.observed_clusters).toEqual(['cluster-0', 'cluster-1', 'cluster-2']);
      expect(feature.meta?.observed_regions).toEqual(['region-0', 'region-1', 'region-2']);
      expect(feature.meta?.runtime).toBe('containerd');
      expect(feature.meta?.version).toBe('0.41.0');
      expect(feature).not.toHaveProperty('meta_keys_omitted');
      expect(feature.meta_array_items_omitted).toEqual({
        observed_clusters: 12,
        observed_regions: 9,
      });
    });

    it('drops meta keys beyond MAX_COMPACT_META_KEYS and sets meta_keys_omitted', async () => {
      const meta = Object.fromEntries(
        Array.from({ length: 40 }, (_, i) => [`key_${String(i).padStart(2, '0')}`, `value-${i}`])
      );
      const feature = await getCompactFeature(makeFeature({ type: 'entity', meta }));
      const keptKeys = Object.keys(feature.meta ?? {});
      expect(keptKeys).toHaveLength(10);
      expect(feature.meta_keys_omitted).toBe(30);
      // insertion order preserved: the first keys survive
      expect(keptKeys[0]).toBe('key_00');
      expect(keptKeys[9]).toBe('key_09');
    });

    it('keeps small meta intact without meta_keys_omitted', async () => {
      const meta = { port: '5560', endpoint_paths: ['/accounts/projects'], note: 'internal HTTP' };
      const feature = await getCompactFeature(makeFeature({ type: 'entity', meta }));
      expect(feature.meta).toEqual(meta);
      expect(feature).not.toHaveProperty('meta_keys_omitted');
    });

    it('samples top-level array values and records omitted items', async () => {
      const meta = {
        ports: [443, 8443, 9200, 9300],
      };
      const feature = await getCompactFeature(makeFeature({ type: 'entity', meta }));
      expect(feature.meta?.ports).toEqual([443, 8443, 9200]);
      expect(feature.meta_array_items_omitted).toEqual({ ports: 1 });
    });

    it('passes through undefined meta without error', async () => {
      const feature = await getCompactFeature(makeFeature({ type: 'entity', meta: undefined }));
      expect(feature.meta).toBeUndefined();
      expect(feature).not.toHaveProperty('meta_keys_omitted');
      expect(feature).not.toHaveProperty('meta_array_items_omitted');
    });

    it('passes through undefined evidence and tags without count fields or error', async () => {
      const feature = await getCompactFeature(
        makeFeature({ type: 'entity', evidence: undefined, tags: undefined })
      );
      expect(feature).not.toHaveProperty('evidence_count');
      expect(feature).not.toHaveProperty('tags_count');
    });

    it('truncates evidence on non-entity inferred type (infrastructure)', async () => {
      const evidence = Array.from({ length: 15 }, (_, i) => `evidence item ${i}`);
      const feature = await getCompactFeature(makeFeature({ type: 'infrastructure', evidence }));
      expect(feature.evidence).toHaveLength(10);
      expect(feature.evidence_count).toBe(15);
    });

    it('omits filter for entity but preserves it for non-entity types', async () => {
      const filter = {
        field: 'service.name',
        operator: 'eq',
        value: 'orders',
      } as Feature['filter'];
      const entity = await getCompactFeature(makeFeature({ type: 'entity', filter }));
      expect(entity).not.toHaveProperty('filter');

      const infra = await getCompactFeature(makeFeature({ type: 'infrastructure', filter }));
      expect(infra).toHaveProperty('filter');
    });
  });

  describe('full view', () => {
    it('returns all StrippedFeatureKeys unchanged and marks view: full', async () => {
      streamsClient.listStreams = jest
        .fn()
        .mockResolvedValue([{ name: 'logs.test' } as Streams.all.Definition]);
      const filter = { field: 'service.name', operator: 'eq', value: 'svc' } as Feature['filter'];
      kiClient.getFeatures = jest
        .fn()
        .mockResolvedValue({ hits: [makeFeature({ type: 'entity', filter })], total: 1 });
      kiClient.getQueryLinks = jest.fn().mockResolvedValue([]);

      const result = await searchKnowledgeIndicatorsToolHandler({
        streamsClient,
        kiClient,
        logger,
        params: { kind: ['feature'] },
        view: 'full',
      });

      expect(result.view).toBe('full');
      const ki = result.knowledge_indicators[0];
      if (ki.kind !== 'feature') throw new Error('Expected feature KI');
      for (const key of STRIPPED_FEATURE_KEYS) {
        expect(ki.feature).toHaveProperty(key);
      }
      expect(ki.feature.filter).toEqual(filter);
    });

    it('returns severity_score and features[].run_id for query KIs unchanged', async () => {
      streamsClient.listStreams = jest
        .fn()
        .mockResolvedValue([{ name: 'logs.test' } as Streams.all.Definition]);
      kiClient.getFeatures = jest.fn().mockResolvedValue({ hits: [], total: 0 });
      kiClient.getQueryLinks = jest.fn().mockResolvedValue([
        {
          'asset.uuid': 'a1',
          'asset.type': 'query',
          'asset.id': 'q1',
          stream_name: 'logs.test',
          rule_backed: true,
          rule_id: 'rule-1',
          query: makeStreamQuery({
            id: 'q1',
            severity_score: 90,
            features: [{ id: 'f1', run_id: 'r1' }] as StreamQuery['features'],
          }),
        },
      ]);

      const result = await searchKnowledgeIndicatorsToolHandler({
        streamsClient,
        kiClient,
        logger,
        params: { kind: ['query'] },
        view: 'full',
      });

      const ki = result.knowledge_indicators[0];
      if (ki.kind !== 'query') throw new Error('Expected query KI');
      expect(ki.query.severity_score).toBe(90);
      expect(ki.query.features).toEqual([{ id: 'f1', run_id: 'r1' }]);
    });
  });
});
