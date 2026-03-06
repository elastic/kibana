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
      registry.lockRegistration();

      const stored = registry.get(feature.featureId);
      expect(stored).toEqual(feature);
    });

    it('registers a feature with all optional fields and stores them correctly', () => {
      const feature = createValidFeature({
        parentFeatureId: 'parent',
        maxNumberOfEndpoints: 3,
        recommendedEndpoints: ['endpoint1', 'endpoint2'],
      });
      registry.register(feature);
      registry.lockRegistration();

      const stored = registry.get(feature.featureId);
      expect(stored).toEqual(feature);
    });

    it('rejects invalid features and does not store them', () => {
      expect(() => registry.register(createValidFeature({ featureId: '' }))).toThrow('featureId');

      registry.lockRegistration();
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

      registry.lockRegistration();
      expect(registry.getAll()).toHaveLength(1);
    });

    it('rejects registration after lock', () => {
      registry.lockRegistration();
      expect(() => registry.register(createValidFeature())).toThrow('locked');
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('locking', () => {
    it('lockRegistration() prevents further registration', () => {
      registry.lockRegistration();
      expect(() => registry.register(createValidFeature())).toThrow('locked');
    });

    it('calling lockRegistration() twice does not throw', () => {
      registry.lockRegistration();
      expect(() => registry.lockRegistration()).not.toThrow();
    });
  });

  describe('validateFeatures', () => {
    it('throws if called before lock', () => {
      expect(() => registry.validateFeatures()).toThrow('not locked');
    });

    it('passes with valid features', () => {
      registry.register(createValidFeature({ featureId: 'parent' }));
      registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
      registry.lockRegistration();
      expect(() => registry.validateFeatures()).not.toThrow();
    });

    it('rejects parentFeatureId referencing non-existent feature', () => {
      registry.register(createValidFeature({ parentFeatureId: 'missing' }));
      registry.lockRegistration();
      expect(() => registry.validateFeatures()).toThrow('parentFeatureId');
    });

    it('rejects recommendedEndpoints count exceeding maxNumberOfEndpoints', () => {
      registry.register(
        createValidFeature({ maxNumberOfEndpoints: 1, recommendedEndpoints: ['ep1', 'ep2'] })
      );
      registry.lockRegistration();
      expect(() => registry.validateFeatures()).toThrow('recommendedEndpoints');
    });
  });

  describe('retrieval', () => {
    it('getAll() returns all registered features after lock', () => {
      registry.register(createValidFeature({ featureId: 'a' }));
      registry.register(createValidFeature({ featureId: 'b' }));
      registry.lockRegistration();
      registry.validateFeatures();
      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((f) => f.featureId)).toEqual(expect.arrayContaining(['a', 'b']));
    });

    it('getAll() returns defensive copies', () => {
      registry.register(createValidFeature({ featureId: 'a' }));
      registry.lockRegistration();
      registry.validateFeatures();
      const first = registry.getAll();
      const second = registry.getAll();
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
    });

    it('get(featureId) returns a single feature', () => {
      registry.register(createValidFeature({ featureId: 'a' }));
      registry.lockRegistration();
      registry.validateFeatures();
      expect(registry.get('a')).toEqual(expect.objectContaining({ featureId: 'a' }));
    });

    it('get(featureId) returns undefined for unknown ID', () => {
      registry.lockRegistration();
      registry.validateFeatures();
      expect(registry.get('unknown')).toBeUndefined();
    });

    const preLockedMethods = [
      { name: 'getAll()', fn: (r: InferenceFeatureRegistry) => r.getAll() },
      { name: 'get()', fn: (r: InferenceFeatureRegistry) => r.get('a') },
    ];

    it.each(preLockedMethods)('$name throws if called before lock', ({ fn }) => {
      expect(() => fn(registry)).toThrow('not locked');
    });
  });
});
