/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATASET_ANALYSIS_FEATURE_TYPE, LOG_PATTERNS_FEATURE_TYPE } from '@kbn/streams-schema';
import type { FeatureClient } from '../../streams/feature/feature_client';
import { shouldIdentifyFeatures } from './should_identify_features';

const createMockFeatureClient = (
  response: { hits: Array<{ type: string; last_seen: string }>; total: number } = {
    hits: [],
    total: 0,
  }
) =>
  ({
    getFeatures: jest.fn().mockResolvedValue(response),
  } as unknown as FeatureClient);

describe('shouldIdentifyFeatures', () => {
  const streamName = 'test-stream';
  const thresholdHours = 12;

  it('returns shouldIdentify: true when no features exist', async () => {
    const featureClient = createMockFeatureClient({ hits: [], total: 0 });

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: true });
  });

  it('returns shouldIdentify: true when only computed features exist', async () => {
    const recentDate = new Date(Date.now() - 1 * 3_600_000).toISOString();
    const featureClient = createMockFeatureClient({
      hits: [
        { type: DATASET_ANALYSIS_FEATURE_TYPE, last_seen: recentDate },
        { type: LOG_PATTERNS_FEATURE_TYPE, last_seen: recentDate },
      ],
      total: 2,
    });

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: true });
  });

  it('ignores computed features and uses inferred for recency check', async () => {
    const recentDate = new Date(Date.now() - 1 * 3_600_000).toISOString();
    const oldInferredDate = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const featureClient = createMockFeatureClient({
      hits: [
        { type: DATASET_ANALYSIS_FEATURE_TYPE, last_seen: recentDate },
        { type: 'entity', last_seen: oldInferredDate },
      ],
      total: 2,
    });

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: true });
  });

  it('returns shouldIdentify: false when inferred features are within threshold', async () => {
    const recentDate = new Date(Date.now() - 1 * 3_600_000).toISOString();
    const featureClient = createMockFeatureClient({
      hits: [
        { type: 'entity', last_seen: recentDate },
        { type: 'dependency', last_seen: recentDate },
      ],
      total: 2,
    });

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: false });
  });

  it('returns shouldIdentify: true when inferred features exceed threshold', async () => {
    const oldDate = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const featureClient = createMockFeatureClient({
      hits: [{ type: 'schema', last_seen: oldDate }],
      total: 1,
    });

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: true });
  });

  it('returns shouldIdentify: true for invalid timestamps', async () => {
    const featureClient = createMockFeatureClient({
      hits: [{ type: 'entity', last_seen: 'not-a-date' }],
      total: 1,
    });

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: true });
  });

  it('returns shouldIdentify: false at the threshold boundary', async () => {
    const justWithinThreshold = new Date(
      Date.now() - thresholdHours * 3_600_000 + 1000
    ).toISOString();
    const featureClient = createMockFeatureClient({
      hits: [{ type: 'entity', last_seen: justWithinThreshold }],
      total: 1,
    });

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: false });
  });
});
