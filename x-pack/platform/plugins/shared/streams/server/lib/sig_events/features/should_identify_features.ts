/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INFERRED_FEATURE_TYPES } from '@kbn/streams-schema';
import type { KnowledgeIndicatorClient } from '../../streams/ki';

export interface ShouldIdentifyFeaturesResult {
  shouldIdentify: boolean;
}

/**
 * Determine whether features identification should run for a stream by
 * comparing the latest revision timestamp of any inferred feature against
 * a threshold expressed in hours.
 *
 * The legacy implementation queried `feature.last_seen`, which existed only
 * on inferred features and tracked the wall-clock of the most recent run.
 * In the unified KI model that field is gone — the data stream's append-only
 * `@timestamp` of the latest revision is now the same signal because every
 * identification run writes a new revision (or a tombstone) for each feature.
 */
export async function shouldIdentifyFeatures({
  kiClient,
  streamName,
  thresholdHours,
}: {
  kiClient: KnowledgeIndicatorClient;
  streamName: string;
  thresholdHours: number;
}): Promise<ShouldIdentifyFeaturesResult> {
  const latest = await kiClient.getLatestRevisionTimestamp(streamName, {
    types: [...INFERRED_FEATURE_TYPES],
  });

  if (!latest) {
    return { shouldIdentify: true };
  }

  const newestTimestamp = new Date(latest['@timestamp']).getTime();

  if (Number.isNaN(newestTimestamp)) {
    return { shouldIdentify: true };
  }

  const thresholdMs = thresholdHours * 3_600_000;

  return {
    shouldIdentify: Date.now() - newestTimestamp >= thresholdMs,
  };
}
