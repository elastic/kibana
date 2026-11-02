/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionReasoningEffort } from '@kbn/inference-common';
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

  it('accepts recommendedEndpoints mixing ids and entries with valid parameters', () => {
    expect(() =>
      validateFeature(
        createValidFeature({
          recommendedEndpoints: [
            'plain',
            { id: 'with_reasoning', parameters: { reasoning: { effort: 'xhigh' } } },
            { id: 'with_temperature', parameters: { temperature: 0 } },
            { id: 'with_max_temperature', parameters: { temperature: 2 } },
            { id: 'without_parameters' },
          ],
        })
      )
    ).not.toThrow();
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
      name: 'empty taskType',
      overrides: { taskType: '' as InferenceFeatureConfig['taskType'] },
      expectedMessage: 'taskType',
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
    {
      name: 'recommendedEndpoints entry with whitespace-only id',
      overrides: { recommendedEndpoints: [{ id: '  ' }] },
      expectedMessage: 'recommendedEndpoints',
    },
    {
      name: 'recommendedEndpoints entry with unknown reasoning effort',
      overrides: {
        recommendedEndpoints: [
          {
            id: 'ep',
            parameters: { reasoning: { effort: 'extreme' as ChatCompletionReasoningEffort } },
          },
        ],
      },
      expectedMessage: 'parameters.reasoning.effort',
    },
    {
      name: 'recommendedEndpoints entry with negative temperature',
      overrides: { recommendedEndpoints: [{ id: 'ep', parameters: { temperature: -0.1 } }] },
      expectedMessage: 'parameters.temperature',
    },
    {
      name: 'recommendedEndpoints entry with temperature above the maximum',
      overrides: { recommendedEndpoints: [{ id: 'ep', parameters: { temperature: 2.1 } }] },
      expectedMessage: 'parameters.temperature',
    },
    {
      name: 'recommendedEndpoints entry with NaN temperature',
      overrides: { recommendedEndpoints: [{ id: 'ep', parameters: { temperature: NaN } }] },
      expectedMessage: 'parameters.temperature',
    },
  ];

  it.each(validationErrors)('rejects $name', ({ overrides, expectedMessage }) => {
    expect(() => validateFeature(createValidFeature(overrides))).toThrow(
      expect.objectContaining({ message: expect.stringContaining(expectedMessage) })
    );
  });
});
