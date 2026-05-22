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
 * comparing the latest revision timestamp of any **active** inferred
 * feature (not tombstoned, not excluded) against a threshold expressed
 * in hours.
 *
 * The legacy implementation queried `feature.last_seen`, which existed only
 * on inferred features and tracked the wall-clock of the most recent run.
 * In the unified KI model that field is gone, and the data stream's
 * append-only `@timestamp` on the latest revision plays the same role:
 * `reconcileInferredFeatures` unconditionally re-pushes every LLM-surfaced
 * feature on its first encounter in a run (matched features land in
 * `updatedFeatures` regardless of payload equality, because the new
 * revision differs at least by `run_id`). So a successful iteration that
 * surfaces any features refreshes the latest active revision timestamp.
 *
 * Tombstones and excluded revisions are intentionally filtered out by
 * `getLatestRevisionTimestamp`. The identification loop never writes
 * either — both come exclusively from user-driven actions (delete,
 * exclude, restore, stream deletion). Counting them would let an
 * external bulk delete or bulk exclude extend the throttle, which is
 * the regression `ea464366a3c0` was written to prevent for the legacy
 * `getFeatures`-based gate.
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
