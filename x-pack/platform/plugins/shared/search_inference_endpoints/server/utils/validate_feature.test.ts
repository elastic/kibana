/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceFeatureConfig } from '../types';
import { validateFeature } from './validate_feature';

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

describe('validateFeature', () => {
  it('accepts a valid feature', () => {
    expect(() => validateFeature(createValidFeature())).not.toThrow();
  });

  const validationErrors: Array<{
    name: string;
    overrides: Partial<InferenceFeatureConfig>;
    expectedMessage: string;
  }> = [
    { name: 'empty featureId', overrides: { featureId: '' }, expectedMessage: 'featureId' },
    {
      name: 'featureId with spaces',
      overrides: { featureId: 'has space' },
      expectedMessage: 'featureId',
    },
    {
      name: 'featureId with uppercase',
      overrides: { featureId: 'HasUpper' },
      expectedMessage: 'featureId',
    },
    {
      name: 'featureId with hyphens',
      overrides: { featureId: 'feat-ure' },
      expectedMessage: 'featureId',
    },
    {
      name: 'featureId with special characters',
      overrides: { featureId: 'feat_ure!' },
      expectedMessage: 'featureId',
    },
    {
      name: 'featureId starting with digit',
      overrides: { featureId: '1abc' },
      expectedMessage: 'featureId',
    },
    {
      name: 'featureId starting with underscore',
      overrides: { featureId: '_abc' },
      expectedMessage: 'featureId',
    },
    { name: 'empty featureName', overrides: { featureName: '' }, expectedMessage: 'featureName' },
    {
      name: 'empty featureDescription',
      overrides: { featureDescription: '' },
      expectedMessage: 'featureDescription',
    },
    {
      name: 'parentFeatureId with uppercase',
      overrides: { parentFeatureId: 'Parent' },
      expectedMessage: 'parentFeatureId',
    },
    {
      name: 'parentFeatureId with hyphens',
      overrides: { parentFeatureId: 'parent-id' },
      expectedMessage: 'parentFeatureId',
    },
    {
      name: 'parentFeatureId with special characters',
      overrides: { parentFeatureId: 'parent!' },
      expectedMessage: 'parentFeatureId',
    },
    {
      name: 'parentFeatureId starting with digit',
      overrides: { parentFeatureId: '1parent' },
      expectedMessage: 'parentFeatureId',
    },
    {
      name: 'parentFeatureId starting with underscore',
      overrides: { parentFeatureId: '_parent' },
      expectedMessage: 'parentFeatureId',
    },
    {
      name: 'maxNumberOfEndpoints < 1',
      overrides: { maxNumberOfEndpoints: 0 },
      expectedMessage: 'maxNumberOfEndpoints',
    },
    {
      name: 'recommendedEndpoints with empty string',
      overrides: { recommendedEndpoints: ['valid', ''] },
      expectedMessage: 'recommendedEndpoints',
    },
  ];

  it.each(validationErrors)('rejects $name', ({ overrides, expectedMessage }) => {
    expect(() => validateFeature(createValidFeature(overrides))).toThrow(
      expect.objectContaining({ message: expect.stringContaining(expectedMessage) })
    );
  });
});
