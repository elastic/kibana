/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isComputedFeature } from '@kbn/streams-schema';
import { FEATURE_LAST_SEEN } from '../../streams/feature/fields';
import type { FeatureClient } from '../../streams/feature/feature_client';

const MIN_INFERRED_FEATURES = 0;

export interface ShouldIdentifyFeaturesResult {
  shouldIdentify: boolean;
}

export async function shouldIdentifyFeatures({
  featureClient,
  streamName,
  thresholdHours,
}: {
  featureClient: FeatureClient;
  streamName: string;
  thresholdHours: number;
}): Promise<ShouldIdentifyFeaturesResult> {
  // We only need the newest inferred feature, but computed features are
  // filtered out in JS, so fetch enough to guarantee at least one inferred
  // hit is included (computed types are few, so 100 is a safe upper bound).
  const { hits } = await featureClient.getFeatures(streamName, {
    limit: 100,
    sort: [{ [FEATURE_LAST_SEEN]: { order: 'desc' } }],
  });

  const inferredHits = hits.filter((hit) => !isComputedFeature(hit));

  if (inferredHits.length <= MIN_INFERRED_FEATURES) {
    return { shouldIdentify: true };
  }

  const newestTimestamp = new Date(inferredHits[0].last_seen).getTime();

  if (Number.isNaN(newestTimestamp)) {
    return { shouldIdentify: true };
  }

  const thresholdMs = thresholdHours * 3_600_000;

  return {
    shouldIdentify: Date.now() - newestTimestamp >= thresholdMs,
  };
}
