/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { type BaseFeature, LOG_SAMPLES_FEATURE_TYPE } from '@kbn/significant-events-schema';
import { assessComputedFeatureMateriality } from './assess_computed_feature_materiality';

const feature = (id: string, type: string, properties: Record<string, unknown>): BaseFeature =>
  ({ id, type, title: id, description: `${id} description`, properties } as unknown as BaseFeature);

const createInferenceClient = (
  output: { material_change: boolean; reason: string } | Error
): BoundInferenceClient =>
  ({
    output: jest.fn().mockImplementation(() =>
      output instanceof Error ? Promise.reject(output) : Promise.resolve({ output, content: '' })
    ),
  } as unknown as BoundInferenceClient);

describe('assessComputedFeatureMateriality', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => jest.clearAllMocks());

  it('returns materialChange: true without an LLM call when there is no prior set', async () => {
    const inferenceClient = createInferenceClient({ material_change: false, reason: 'unused' });

    const result = await assessComputedFeatureMateriality({
      inferenceClient,
      previous: [],
      current: [feature('log_patterns', 'log_patterns', { patterns: [] })],
      logger,
    });

    expect(result.materialChange).toBe(true);
    expect(inferenceClient.output).not.toHaveBeenCalled();
  });

  it('treats a prior set of only log_samples as no prior (log_samples is excluded)', async () => {
    const inferenceClient = createInferenceClient({ material_change: false, reason: 'unused' });

    const result = await assessComputedFeatureMateriality({
      inferenceClient,
      previous: [feature('log_samples', LOG_SAMPLES_FEATURE_TYPE, { samples: [1, 2, 3] })],
      current: [feature('log_patterns', 'log_patterns', { patterns: ['a'] })],
      logger,
    });

    expect(result.materialChange).toBe(true);
    expect(inferenceClient.output).not.toHaveBeenCalled();
  });

  it('returns the LLM verdict (no material change) when only volatile fields shifted', async () => {
    const inferenceClient = createInferenceClient({
      material_change: false,
      reason: 'only counts changed',
    });

    const result = await assessComputedFeatureMateriality({
      inferenceClient,
      previous: [feature('log_patterns', 'log_patterns', { patterns: [{ pattern: 'a', count: 1 }] })],
      current: [feature('log_patterns', 'log_patterns', { patterns: [{ pattern: 'a', count: 999 }] })],
      logger,
    });

    expect(result).toEqual({ materialChange: false, reason: 'only counts changed' });
    expect(inferenceClient.output).toHaveBeenCalledTimes(1);
  });

  it('returns the LLM verdict (material change) for a structural change', async () => {
    const inferenceClient = createInferenceClient({
      material_change: true,
      reason: 'new field appeared',
    });

    const result = await assessComputedFeatureMateriality({
      inferenceClient,
      previous: [feature('dataset_analysis', 'dataset_analysis', { fields: ['a'] })],
      current: [feature('dataset_analysis', 'dataset_analysis', { fields: ['a', 'b'] })],
      logger,
    });

    expect(result).toEqual({ materialChange: true, reason: 'new field appeared' });
  });

  it('fails open (materialChange: true) and logs a warning when the LLM call throws', async () => {
    const inferenceClient = createInferenceClient(new Error('connector exploded'));

    const result = await assessComputedFeatureMateriality({
      inferenceClient,
      previous: [feature('log_patterns', 'log_patterns', { patterns: ['a'] })],
      current: [feature('log_patterns', 'log_patterns', { patterns: ['b'] })],
      logger,
    });

    expect(result.materialChange).toBe(true);
    expect(result.reason).toContain('connector exploded');
    expect(logger.warn).toHaveBeenCalled();
  });
});
