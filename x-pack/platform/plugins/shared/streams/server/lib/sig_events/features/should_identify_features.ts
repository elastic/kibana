/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INFERRED_FEATURE_TYPES } from '@kbn/streams-schema';
import type { FeatureClient } from '../../streams/feature/feature_client';

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
  const latest = await featureClient.getLatestRevisionTimestamp(streamName, {
    type: [...INFERRED_FEATURE_TYPES],
  });

  if (!latest) {
    return { shouldIdentify: true };
  }

  const ageMs = Date.now() - new Date(latest['@timestamp']).getTime();

  if (Number.isNaN(ageMs)) {
    return { shouldIdentify: true };
  }

  return { shouldIdentify: ageMs >= thresholdHours * 3_600_000 };
}
