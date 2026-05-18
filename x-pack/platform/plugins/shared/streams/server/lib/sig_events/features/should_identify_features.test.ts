/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INFERRED_FEATURE_TYPES } from '@kbn/streams-schema';
import type { FeatureClient } from '../../streams/feature/feature_client';
import { shouldIdentifyFeatures } from './should_identify_features';

const createMockFeatureClient = (latestRevision: { '@timestamp': string } | null = null) =>
  ({
    getLatestRevisionTimestamp: jest.fn().mockResolvedValue(latestRevision),
  } as unknown as FeatureClient);

describe('shouldIdentifyFeatures', () => {
  const streamName = 'test-stream';
  const thresholdHours = 12;

  it('returns shouldIdentify: true when no inferred features exist', async () => {
    const featureClient = createMockFeatureClient(null);

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: true });
  });

  it('calls getLatestRevisionTimestamp with INFERRED_FEATURE_TYPES', async () => {
    const featureClient = createMockFeatureClient(null);

    await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(featureClient.getLatestRevisionTimestamp).toHaveBeenCalledWith(streamName, {
      type: [...INFERRED_FEATURE_TYPES],
    });
  });

  it('returns shouldIdentify: false when newest inferred feature is within threshold', async () => {
    const recentDate = new Date(Date.now() - 1 * 3_600_000).toISOString();
    const featureClient = createMockFeatureClient({ '@timestamp': recentDate });

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: false });
  });

  it('returns shouldIdentify: true when newest inferred feature exceeds threshold', async () => {
    const oldDate = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const featureClient = createMockFeatureClient({ '@timestamp': oldDate });

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: true });
  });

  it('returns shouldIdentify: true for invalid timestamps', async () => {
    const featureClient = createMockFeatureClient({ '@timestamp': 'not-a-date' });

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
    const featureClient = createMockFeatureClient({ '@timestamp': justWithinThreshold });

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: false });
  });
});
