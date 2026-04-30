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

const RECENCY_BATCH_CONCURRENCY = 10;

/**
 * Checks feature recency for multiple streams with bounded concurrency
 * to avoid overwhelming ES with unbounded parallel queries.
 */
export async function areFeaturesRecentBatch({
  featureClient,
  streamNames,
  thresholdHours,
}: {
  featureClient: FeatureClient;
  streamNames: string[];
  thresholdHours: number;
}): Promise<Map<string, FeaturesRecencyResult>> {
  const result = new Map<string, FeaturesRecencyResult>();
  const pending = [...streamNames];

  while (pending.length > 0) {
    const batch = pending.splice(0, RECENCY_BATCH_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (streamName) => {
        const recency = await areFeaturesRecent({ featureClient, streamName, thresholdHours });
        return [streamName, recency] as const;
      })
    );
    for (const [streamName, recency] of results) {
      result.set(streamName, recency);
    }
  }

  return result;
}
