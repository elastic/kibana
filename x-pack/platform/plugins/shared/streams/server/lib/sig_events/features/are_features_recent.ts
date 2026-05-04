/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FEATURE_LAST_SEEN } from '../../streams/feature/fields';
import type { FeatureClient } from '../../streams/feature/feature_client';

export interface FeaturesRecencyResult {
  isRecent: boolean;
  newestLastSeen?: string;
}

export async function areFeaturesRecent({
  featureClient,
  streamName,
  thresholdHours,
}: {
  featureClient: FeatureClient;
  streamName: string;
  thresholdHours: number;
}): Promise<FeaturesRecencyResult> {
  const { hits } = await featureClient.getFeatures(streamName, {
    limit: 1,
    sort: [{ [FEATURE_LAST_SEEN]: { order: 'desc' } }],
  });

  if (hits.length === 0) {
    return { isRecent: false };
  }

  const newestLastSeen = hits[0].last_seen;
  const newestTimestamp = new Date(newestLastSeen).getTime();

  if (Number.isNaN(newestTimestamp)) {
    return { isRecent: false };
  }

  const thresholdMs = thresholdHours * 3_600_000;
  const isRecent = Date.now() - newestTimestamp < thresholdMs;

  return { isRecent, newestLastSeen };
}
