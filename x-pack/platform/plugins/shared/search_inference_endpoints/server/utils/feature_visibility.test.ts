/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { InferenceFeatureConfig } from '../types';
import {
  buildVisibilityCheck,
  filterVisibleFeatures,
  toFeatureResponse,
} from './feature_visibility';

const createFeature = (
  overrides: Partial<InferenceFeatureConfig> = {}
): InferenceFeatureConfig => ({
  featureId: 'test_feature',
  featureName: 'Test Feature',
  featureDescription: 'A test feature',
  taskType: 'chat_completion',
  recommendedEndpoints: [],
  ...overrides,
});

const createUiSettingsClient = (
  get: jest.Mock = jest.fn().mockResolvedValue(undefined)
): IUiSettingsClient => ({ get } as unknown as IUiSettingsClient);

describe('buildVisibilityCheck', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true for features without a visibilityCondition', async () => {
    const features = [createFeature({ featureId: 'unconditional' })];

    const isVisible = await buildVisibilityCheck(features, createUiSettingsClient(), logger);

    expect(isVisible(features[0])).toBe(true);
  });

  it('returns true when the uiSetting matches the expected value', async () => {
    const get = jest.fn().mockResolvedValue('classic');
    const features = [
      createFeature({
        featureId: 'gated',
        visibilityCondition: { key: 'aiAssistant:preferredChatExperience', value: 'classic' },
      }),
    ];

    const isVisible = await buildVisibilityCheck(features, createUiSettingsClient(get), logger);

    expect(isVisible(features[0])).toBe(true);
  });

  it('returns false when the uiSetting does not match', async () => {
    const get = jest.fn().mockResolvedValue('agent');
    const features = [
      createFeature({
        featureId: 'gated',
        visibilityCondition: { key: 'aiAssistant:preferredChatExperience', value: 'classic' },
      }),
    ];

    const isVisible = await buildVisibilityCheck(features, createUiSettingsClient(get), logger);

    expect(isVisible(features[0])).toBe(false);
  });

  it('reads each unique uiSetting key only once even when multiple features share it', async () => {
    const get = jest.fn().mockResolvedValue('classic');
    const features = [
      createFeature({
        featureId: 'first',
        visibilityCondition: { key: 'shared_key', value: 'classic' },
      }),
      createFeature({
        featureId: 'second',
        visibilityCondition: { key: 'shared_key', value: 'classic' },
      }),
      createFeature({
        featureId: 'third',
        visibilityCondition: { key: 'other_key', value: true },
      }),
    ];

    await buildVisibilityCheck(features, createUiSettingsClient(get), logger);

    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith('shared_key');
    expect(get).toHaveBeenCalledWith('other_key');
  });

  it('does not call uiSettings when no feature has a visibilityCondition', async () => {
    const get = jest.fn();
    const features = [createFeature({ featureId: 'a' }), createFeature({ featureId: 'b' })];

    await buildVisibilityCheck(features, createUiSettingsClient(get), logger);

    expect(get).not.toHaveBeenCalled();
  });

  it('fails open and logs at debug when uiSettings.get throws', async () => {
    const get = jest.fn().mockRejectedValue(new Error('uiSettings unavailable'));
    const features = [
      createFeature({
        featureId: 'gated',
        visibilityCondition: { key: 'flaky_key', value: 'classic' },
      }),
    ];

    const isVisible = await buildVisibilityCheck(features, createUiSettingsClient(get), logger);

    expect(isVisible(features[0])).toBe(true);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Failed to read uiSetting "flaky_key"')
    );
  });

  it('matches non-string primitive values via strict equality', async () => {
    const get = jest.fn().mockImplementation((key: string) => {
      if (key === 'numeric') return Promise.resolve(42);
      if (key === 'flag') return Promise.resolve(true);
      return Promise.resolve(null);
    });
    const features = [
      createFeature({
        featureId: 'numeric_match',
        visibilityCondition: { key: 'numeric', value: 42 },
      }),
      createFeature({
        featureId: 'numeric_mismatch',
        visibilityCondition: { key: 'numeric', value: 43 },
      }),
      createFeature({
        featureId: 'boolean_match',
        visibilityCondition: { key: 'flag', value: true },
      }),
      createFeature({
        featureId: 'null_match',
        visibilityCondition: { key: 'absent', value: null },
      }),
    ];

    const isVisible = await buildVisibilityCheck(features, createUiSettingsClient(get), logger);

    expect(isVisible(features[0])).toBe(true);
    expect(isVisible(features[1])).toBe(false);
    expect(isVisible(features[2])).toBe(true);
    expect(isVisible(features[3])).toBe(true);
  });
});

describe('filterVisibleFeatures', () => {
  it('returns every feature when all are visible', () => {
    const features = [
      createFeature({ featureId: 'a' }),
      createFeature({ featureId: 'b' }),
      createFeature({ featureId: 'c' }),
    ];

    const result = filterVisibleFeatures(features, () => true);

    expect(result).toEqual(features);
  });

  it('drops features the predicate rejects', () => {
    const features = [
      createFeature({ featureId: 'visible' }),
      createFeature({ featureId: 'hidden' }),
    ];

    const result = filterVisibleFeatures(features, (feature) => feature.featureId !== 'hidden');

    expect(result.map((f) => f.featureId)).toEqual(['visible']);
  });

  it('keeps a parent when at least one child is visible', () => {
    const features = [
      createFeature({ featureId: 'parent' }),
      createFeature({ featureId: 'visible_child', parentFeatureId: 'parent' }),
      createFeature({ featureId: 'hidden_child', parentFeatureId: 'parent' }),
    ];

    const result = filterVisibleFeatures(
      features,
      (feature) => feature.featureId !== 'hidden_child'
    );

    expect(result.map((f) => f.featureId)).toEqual(['parent', 'visible_child']);
  });

  it('drops a parent when all of its children are hidden', () => {
    const features = [
      createFeature({ featureId: 'parent' }),
      createFeature({ featureId: 'hidden_child', parentFeatureId: 'parent' }),
    ];

    const result = filterVisibleFeatures(
      features,
      (feature) => feature.featureId !== 'hidden_child'
    );

    expect(result).toEqual([]);
  });

  it('keeps a parent that has no registered children', () => {
    const features = [createFeature({ featureId: 'lonely_parent' })];

    const result = filterVisibleFeatures(features, () => true);

    expect(result.map((f) => f.featureId)).toEqual(['lonely_parent']);
  });

  it('cascades a hidden parent to its direct children', () => {
    const features = [
      createFeature({ featureId: 'parent' }),
      createFeature({ featureId: 'child', parentFeatureId: 'parent' }),
    ];

    const result = filterVisibleFeatures(features, (feature) => feature.featureId !== 'parent');

    expect(result).toEqual([]);
  });

  it('cascades through multiple levels of nesting', () => {
    const features = [
      createFeature({ featureId: 'grandparent' }),
      createFeature({ featureId: 'parent', parentFeatureId: 'grandparent' }),
      createFeature({ featureId: 'child', parentFeatureId: 'parent' }),
    ];

    const result = filterVisibleFeatures(
      features,
      (feature) => feature.featureId !== 'grandparent'
    );

    expect(result).toEqual([]);
  });

  it('only cascades along the hidden branch and leaves siblings alone', () => {
    const features = [
      createFeature({ featureId: 'root' }),
      createFeature({ featureId: 'hidden_branch', parentFeatureId: 'root' }),
      createFeature({ featureId: 'orphaned_child', parentFeatureId: 'hidden_branch' }),
      createFeature({ featureId: 'visible_branch', parentFeatureId: 'root' }),
    ];

    const result = filterVisibleFeatures(
      features,
      (feature) => feature.featureId !== 'hidden_branch'
    );

    expect(result.map((f) => f.featureId)).toEqual(['root', 'visible_branch']);
  });

  it('preserves the input order of features', () => {
    const features = [
      createFeature({ featureId: 'parent' }),
      createFeature({ featureId: 'first_child', parentFeatureId: 'parent' }),
      createFeature({ featureId: 'second_child', parentFeatureId: 'parent' }),
    ];

    const result = filterVisibleFeatures(features, () => true);

    expect(result.map((f) => f.featureId)).toEqual(['parent', 'first_child', 'second_child']);
  });
});

describe('toFeatureResponse', () => {
  it('strips visibilityCondition from the returned object', () => {
    const feature = createFeature({
      visibilityCondition: { key: 'aiAssistant:preferredChatExperience', value: 'classic' },
    });

    const result = toFeatureResponse(feature);

    expect(result).not.toHaveProperty('visibilityCondition');
  });

  it('preserves all other fields', () => {
    const feature = createFeature({
      featureId: 'child',
      parentFeatureId: 'parent',
      featureName: 'Child Feature',
      featureDescription: 'Child description',
      taskType: 'chat_completion',
      recommendedEndpoints: ['endpoint_a', 'endpoint_b'],
      maxNumberOfEndpoints: 2,
      isBeta: true,
      isTechPreview: false,
      visibilityCondition: { key: 'k', value: 'v' },
    });

    const result = toFeatureResponse(feature);

    expect(result).toEqual({
      featureId: 'child',
      parentFeatureId: 'parent',
      featureName: 'Child Feature',
      featureDescription: 'Child description',
      taskType: 'chat_completion',
      recommendedEndpoints: ['endpoint_a', 'endpoint_b'],
      maxNumberOfEndpoints: 2,
      isBeta: true,
      isTechPreview: false,
    });
  });

  it('does not mutate the input feature', () => {
    const feature = createFeature({
      visibilityCondition: { key: 'k', value: 'v' },
    });
    const snapshot = { ...feature };

    toFeatureResponse(feature);

    expect(feature).toEqual(snapshot);
  });
});
