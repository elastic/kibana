/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INFERRED_FEATURE_TYPES } from '@kbn/streams-schema';
import { FEATURE_LAST_SEEN } from '../../streams/feature/fields';
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

  it('returns shouldIdentify: true when no inferred features exist', async () => {
    const featureClient = createMockFeatureClient({ hits: [], total: 0 });

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: true });
  });

  it('passes INFERRED_FEATURE_TYPES as type filter with limit 1', async () => {
    const featureClient = createMockFeatureClient({ hits: [], total: 0 });

    await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(featureClient.getFeatures).toHaveBeenCalledWith(streamName, {
      type: [...INFERRED_FEATURE_TYPES],
      limit: 1,
      sort: [{ [FEATURE_LAST_SEEN]: { order: 'desc' } }],
    });
  });

  it('returns shouldIdentify: false when newest inferred feature is within threshold', async () => {
    const recentDate = new Date(Date.now() - 1 * 3_600_000).toISOString();
    const featureClient = createMockFeatureClient({
      hits: [{ type: 'entity', last_seen: recentDate }],
      total: 1,
    });

    const result = await shouldIdentifyFeatures({
      featureClient,
      streamName,
      thresholdHours,
    });

    expect(result).toEqual({ shouldIdentify: false });
  });

  it('returns shouldIdentify: true when newest inferred feature exceeds threshold', async () => {
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
