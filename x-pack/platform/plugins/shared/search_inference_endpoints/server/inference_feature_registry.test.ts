/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
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

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    registry = new InferenceFeatureRegistry(mockLogger.get());
  });

  describe('registration', () => {
    it('registers a minimal valid feature and returns ok', () => {
      const result = registry.register(createValidFeature());
      expect(result).toEqual({ ok: true });
    });

    it('registers a feature with all optional fields and stores them correctly', () => {
      registry.register(createValidFeature({ featureId: 'parent' }));
      const feature = createValidFeature({
        featureId: 'child',
        parentFeatureId: 'parent',
        maxNumberOfEndpoints: 3,
        recommendedEndpoints: ['endpoint1', 'endpoint2'],
      });
      const result = registry.register(feature);

      expect(result).toEqual({ ok: true });
      expect(registry.get(feature.featureId)).toEqual(feature);
    });

    it('returns error and does not store invalid features', () => {
      const result = registry.register(createValidFeature({ featureId: '' }));

      expect(result).toEqual({ ok: false, error: expect.stringContaining('featureId') });
      expect(registry.getAll()).toHaveLength(0);
      expect(mockLogger.get().error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register inference feature')
      );
    });

    it('returns error for featureId starting with a digit', () => {
      const result = registry.register(createValidFeature({ featureId: '1abc' }));

      expect(result).toEqual({ ok: false, error: expect.stringContaining('featureId') });
      expect(mockLogger.get().error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register inference feature')
      );
    });

    it('returns error for duplicate featureId and keeps the first registration', () => {
      const first = createValidFeature({ featureName: 'First' });
      const second = createValidFeature({ featureName: 'Second' });

      registry.register(first);
      const result = registry.register(second);

      expect(result).toEqual({ ok: false, error: expect.stringContaining('already registered') });
      expect(registry.getAll()).toHaveLength(1);
      expect(registry.get(first.featureId)).toEqual(first);
      expect(mockLogger.get().error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register inference feature')
      );
    });

    it('returns error for parentFeatureId referencing non-existent feature', () => {
      const result = registry.register(createValidFeature({ parentFeatureId: 'missing' }));

      expect(result).toEqual({ ok: false, error: expect.stringContaining('parentFeatureId') });
      expect(mockLogger.get().error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register inference feature')
      );
    });

    it('accepts child after parent is registered', () => {
      registry.register(createValidFeature({ featureId: 'parent' }));
      const result = registry.register(
        createValidFeature({ featureId: 'child', parentFeatureId: 'parent' })
      );

      expect(result).toEqual({ ok: true });
      expect(registry.getAll()).toHaveLength(2);
    });

    it('allows registration at any time', () => {
      registry.register(createValidFeature({ featureId: 'a' }));
      expect(registry.getAll()).toHaveLength(1);

      registry.register(createValidFeature({ featureId: 'b' }));
      expect(registry.getAll()).toHaveLength(2);
    });
  });

  describe('retrieval', () => {
    it('getAll() returns all registered features', () => {
      registry.register(createValidFeature({ featureId: 'a' }));
      registry.register(createValidFeature({ featureId: 'b' }));
      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((f) => f.featureId)).toEqual(expect.arrayContaining(['a', 'b']));
    });

    it('returns new array references on successive getAll() calls', () => {
      registry.register(createValidFeature({ featureId: 'a' }));
      const first = registry.getAll();
      const second = registry.getAll();
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
    });

    it('get(featureId) returns a single feature', () => {
      registry.register(createValidFeature({ featureId: 'a' }));
      registry.register(createValidFeature({ featureId: 'b' }));
      registry.register(createValidFeature({ featureId: 'c' }));
      expect(registry.get('b')).toEqual(expect.objectContaining({ featureId: 'b' }));
    });

    it('get(featureId) returns undefined for unknown ID', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });

    it('getAll() returns empty array when no features registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('updateRecommendedEndpoints', () => {
    it('returns ok and mutates recommendedEndpoints for a registered feature', () => {
      registry.register(createValidFeature({ featureId: 'my_feature' }));

      const result = registry.updateRecommendedEndpoints('my_feature', ['ep-1', 'ep-2']);

      expect(result).toEqual({ ok: true });
      expect(registry.get('my_feature')?.recommendedEndpoints).toEqual(['ep-1', 'ep-2']);
    });

    it('replaces endpoints on successive calls (does not append)', () => {
      registry.register(
        createValidFeature({ featureId: 'my_feature', recommendedEndpoints: ['old'] })
      );

      registry.updateRecommendedEndpoints('my_feature', ['new-1', 'new-2']);
      registry.updateRecommendedEndpoints('my_feature', ['final']);

      expect(registry.get('my_feature')?.recommendedEndpoints).toEqual(['final']);
    });

    it('does not mutate other fields on the feature', () => {
      const feature = createValidFeature({ featureId: 'my_feature', featureName: 'Keep Me' });
      registry.register(feature);

      registry.updateRecommendedEndpoints('my_feature', ['ep-1']);

      const updated = registry.get('my_feature');
      expect(updated?.featureName).toBe('Keep Me');
      expect(updated?.featureDescription).toBe(feature.featureDescription);
    });

    it('returns error and does not update for an unknown featureId', () => {
      const result = registry.updateRecommendedEndpoints('unknown', ['ep-1']);

      expect(result).toEqual({ ok: false, error: expect.stringContaining('"unknown"') });
      expect(mockLogger.get().error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update recommended endpoints')
      );
    });

    it('returns error and does not update when endpoints array is empty', () => {
      registry.register(
        createValidFeature({ featureId: 'my_feature', recommendedEndpoints: ['original'] })
      );

      const result = registry.updateRecommendedEndpoints('my_feature', []);

      expect(result).toEqual({ ok: false, error: expect.stringContaining('not be empty') });
      expect(registry.get('my_feature')?.recommendedEndpoints).toEqual(['original']);
    });

    it('returns error and does not update when endpoints contain an empty string', () => {
      registry.register(
        createValidFeature({ featureId: 'my_feature', recommendedEndpoints: ['original'] })
      );

      const result = registry.updateRecommendedEndpoints('my_feature', ['ep-1', '']);

      expect(result).toEqual({ ok: false, error: expect.stringContaining('empty strings') });
      expect(registry.get('my_feature')?.recommendedEndpoints).toEqual(['original']);
    });

    it('returns error and does not update when endpoints contain a whitespace-only string', () => {
      registry.register(
        createValidFeature({ featureId: 'my_feature', recommendedEndpoints: ['original'] })
      );

      const result = registry.updateRecommendedEndpoints('my_feature', ['ep-1', '   ']);

      expect(result).toEqual({ ok: false, error: expect.stringContaining('empty strings') });
      expect(registry.get('my_feature')?.recommendedEndpoints).toEqual(['original']);
    });

    it('logs a debug message on success', () => {
      registry.register(createValidFeature({ featureId: 'my_feature' }));

      registry.updateRecommendedEndpoints('my_feature', ['ep-1']);

      expect(mockLogger.get().debug).toHaveBeenCalledWith(expect.stringContaining('"my_feature"'));
    });
  });
});
