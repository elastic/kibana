/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { InferenceFeatureConfig } from './types';
import { InferenceFeatureRegistry } from './inference_feature_registry';

const createValidFeature = (
  overrides: Partial<InferenceFeatureConfig> = {}
): InferenceFeatureConfig => ({
  featureId: 'test_feature',
  featureName: 'Test Feature',
  featureDescription: 'A test feature',
  taskType: 'text_embedding',
  recommendedEndpoints: [],
  ...overrides,
});

describe('InferenceFeatureRegistry', () => {
  let registry: InferenceFeatureRegistry;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    registry = new InferenceFeatureRegistry(mockLogger.get());
    registry.setElasticsearchClient(mockEsClient);
  });

  describe('registration', () => {
    it('registers a minimal valid feature and returns ok', async () => {
      const result = await registry.register(createValidFeature());
      expect(result).toEqual({ ok: true, warnings: [] });
    });

    it('registers a feature with all optional fields and stores them correctly', async () => {
      await registry.register(createValidFeature({ featureId: 'parent' }));
      const feature = createValidFeature({
        featureId: 'child',
        parentFeatureId: 'parent',
        maxNumberOfEndpoints: 3,
        recommendedEndpoints: ['endpoint1', 'endpoint2'],
      });

      mockEsClient.inference.get.mockResolvedValueOnce({
        endpoints: [
          {
            inference_id: 'endpoint1',
            task_type: 'text_embedding',
            service: 'elser',
            service_settings: {},
          },
        ],
      } as never);
      mockEsClient.inference.get.mockResolvedValueOnce({
        endpoints: [
          {
            inference_id: 'endpoint2',
            task_type: 'text_embedding',
            service: 'elser',
            service_settings: {},
          },
        ],
      } as never);

      const result = await registry.register(feature);

      expect(result).toEqual({ ok: true, warnings: [] });
      expect(registry.get(feature.featureId)).toEqual(feature);
    });

    it('returns error and does not store invalid features', async () => {
      const result = await registry.register(createValidFeature({ featureId: '' }));

      expect(result).toEqual({ ok: false, error: expect.stringContaining('featureId') });
      expect(registry.getAll()).toHaveLength(0);
      expect(mockLogger.get().error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register inference feature')
      );
    });

    it('returns error for featureId starting with a digit', async () => {
      const result = await registry.register(createValidFeature({ featureId: '1abc' }));

      expect(result).toEqual({ ok: false, error: expect.stringContaining('featureId') });
      expect(mockLogger.get().error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register inference feature')
      );
    });

    it('returns error for duplicate featureId', async () => {
      await registry.register(createValidFeature());
      const result = await registry.register(createValidFeature());

      expect(result).toEqual({ ok: false, error: expect.stringContaining('already registered') });
      expect(registry.getAll()).toHaveLength(1);
      expect(mockLogger.get().error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register inference feature')
      );
    });

    it('returns error for parentFeatureId referencing non-existent feature', async () => {
      const result = await registry.register(createValidFeature({ parentFeatureId: 'missing' }));

      expect(result).toEqual({ ok: false, error: expect.stringContaining('parentFeatureId') });
      expect(mockLogger.get().error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register inference feature')
      );
    });

    it('accepts child after parent is registered', async () => {
      await registry.register(createValidFeature({ featureId: 'parent' }));
      const result = await registry.register(
        createValidFeature({ featureId: 'child', parentFeatureId: 'parent' })
      );

      expect(result).toEqual({ ok: true, warnings: [] });
      expect(registry.getAll()).toHaveLength(2);
    });

    it('allows registration at any time', async () => {
      await registry.register(createValidFeature({ featureId: 'a' }));
      expect(registry.getAll()).toHaveLength(1);

      await registry.register(createValidFeature({ featureId: 'b' }));
      expect(registry.getAll()).toHaveLength(2);
    });
  });

  describe('backend checks', () => {
    it('returns warning when a recommended endpoint does not exist', async () => {
      mockEsClient.inference.get.mockRejectedValueOnce({ statusCode: 404 });

      const result = await registry.register(
        createValidFeature({ recommendedEndpoints: ['missing_endpoint'] })
      );

      expect(result).toEqual({
        ok: true,
        warnings: [expect.stringContaining('missing_endpoint')],
      });
      expect(mockLogger.get().warn).toHaveBeenCalledWith(
        expect.stringContaining('was not found in Elasticsearch')
      );
    });

    it('returns warning when endpoint task type does not match feature task type', async () => {
      mockEsClient.inference.get.mockResolvedValueOnce({
        endpoints: [
          {
            inference_id: 'ep1',
            task_type: 'sparse_embedding',
            service: 'elser',
            service_settings: {},
          },
        ],
      } as never);

      const result = await registry.register(
        createValidFeature({
          taskType: 'text_embedding',
          recommendedEndpoints: ['ep1'],
        })
      );

      expect(result).toEqual({
        ok: true,
        warnings: [expect.stringContaining('sparse_embedding')],
      });
      expect(mockLogger.get().warn).toHaveBeenCalledWith(expect.stringContaining('task type'));
    });

    it('returns no warnings when endpoints exist and task types match', async () => {
      mockEsClient.inference.get.mockResolvedValueOnce({
        endpoints: [
          {
            inference_id: 'ep1',
            task_type: 'text_embedding',
            service: 'elser',
            service_settings: {},
          },
        ],
      } as never);

      const result = await registry.register(createValidFeature({ recommendedEndpoints: ['ep1'] }));

      expect(result).toEqual({ ok: true, warnings: [] });
    });

    it('handles ES client errors gracefully and returns warning', async () => {
      mockEsClient.inference.get.mockRejectedValueOnce(new Error('connection error'));

      const result = await registry.register(createValidFeature({ recommendedEndpoints: ['ep1'] }));

      expect(result).toEqual({
        ok: true,
        warnings: [expect.stringContaining('could not be verified')],
      });
      expect(mockLogger.get().warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check inference endpoint')
      );
    });

    it('skips backend checks when no ES client is set', async () => {
      const registryWithoutEs = new InferenceFeatureRegistry(mockLogger.get());

      const result = await registryWithoutEs.register(
        createValidFeature({ recommendedEndpoints: ['ep1'] })
      );

      expect(result).toEqual({ ok: true, warnings: [] });
      expect(mockEsClient.inference.get).not.toHaveBeenCalled();
    });
  });

  describe('retrieval', () => {
    it('getAll() returns all registered features', async () => {
      await registry.register(createValidFeature({ featureId: 'a' }));
      await registry.register(createValidFeature({ featureId: 'b' }));
      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((f) => f.featureId)).toEqual(expect.arrayContaining(['a', 'b']));
    });

    it('returns new array references on successive getAll() calls', async () => {
      await registry.register(createValidFeature({ featureId: 'a' }));
      const first = registry.getAll();
      const second = registry.getAll();
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
    });

    it('get(featureId) returns a single feature', async () => {
      await registry.register(createValidFeature({ featureId: 'a' }));
      await registry.register(createValidFeature({ featureId: 'b' }));
      await registry.register(createValidFeature({ featureId: 'c' }));
      expect(registry.get('b')).toEqual(expect.objectContaining({ featureId: 'b' }));
    });

    it('get(featureId) returns undefined for unknown ID', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });

    it('getAll() returns empty array when no features registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });
});
