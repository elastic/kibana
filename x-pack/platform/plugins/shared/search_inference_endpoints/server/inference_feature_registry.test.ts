/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  beforeEach(() => {
    registry = new InferenceFeatureRegistry();
  });

  describe('registration', () => {
    it('registers a minimal valid feature and stores it correctly', () => {
      const feature = createValidFeature();
      registry.register(feature);

      const stored = registry.get(feature.featureId);
      expect(stored).toEqual(feature);
    });

    it('registers a feature with all optional fields and stores them correctly', () => {
      registry.register(createValidFeature({ featureId: 'parent' }));
      const feature = createValidFeature({
        featureId: 'child',
        parentFeatureId: 'parent',
        maxNumberOfEndpoints: 3,
        recommendedEndpoints: ['endpoint1', 'endpoint2'],
      });
      registry.register(feature);

      const stored = registry.get(feature.featureId);
      expect(stored).toEqual(feature);
    });

    it('rejects invalid features and does not store them', () => {
      expect(() => registry.register(createValidFeature({ featureId: '' }))).toThrow('featureId');

      expect(registry.getAll()).toHaveLength(0);
    });

    it('rejects featureId starting with a digit', () => {
      expect(() => registry.register(createValidFeature({ featureId: '1abc' }))).toThrow(
        'featureId'
      );
    });

    it('rejects duplicate featureId', () => {
      registry.register(createValidFeature());
      expect(() => registry.register(createValidFeature())).toThrow('already registered');

      expect(registry.getAll()).toHaveLength(1);
    });

    it('rejects parentFeatureId referencing non-existent feature', () => {
      expect(() => registry.register(createValidFeature({ parentFeatureId: 'missing' }))).toThrow(
        'parentFeatureId'
      );
    });

    it('accepts child after parent is registered', () => {
      registry.register(createValidFeature({ featureId: 'parent' }));
      expect(() =>
        registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }))
      ).not.toThrow();
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
});
