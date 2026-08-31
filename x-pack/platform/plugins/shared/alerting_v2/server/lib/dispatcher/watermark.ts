/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DispatcherPipelineInput, DispatcherPipelineResult } from './types';

/**
 * Derives the next persisted watermark from a tick's outcome.
 *
 * Rules (applied in order):
 * - Aborted before StoreActionsStep (recordedEpisodes undefined): no advance.
 * - No actions: window fully consumed. Advance to windowEnd.
 * - Truncated (row count === EPISODE_QUERY_LIMIT): advance to the last fetched
 *   episode's timestamp (the truncation edge); the deferred tail is re-read next tick.
 * - All other outcomes (no_episodes, normal completion): advance to windowEnd.
 *
 * The result is always clamped to `≥ eventWatermark` so the watermark never regresses.
 */
export const computeNextWatermark = ({
  input,
  result,
}: {
  input: DispatcherPipelineInput;
  result: DispatcherPipelineResult;
}): Date => {
  const { eventWatermark, windowEnd } = input;
  const { finalState, haltReason } = result;

  let nextWatermark: Date;

  if (haltReason === 'aborted' && finalState.recordedEpisodes === undefined) {
    // Pipeline stopped before StoreActionsStep — no records written, do not advance.
    nextWatermark = eventWatermark;
  } else if (haltReason === 'no_actions') {
    // All episodes were filtered (e.g. maintenance window) — window fully consumed.
    // Must be checked before the truncated branch: a truncated batch where all
    // episodes were filtered still advanced through the full window logically.
    nextWatermark = windowEnd;
  } else if (finalState.scan?.truncated) {
    // EPISODE_QUERY_LIMIT hit: advance to the truncation edge; the tail will be
    // re-read from eventWatermark - OVERLAP on the next tick.
    nextWatermark = finalState.scan.truncationEdge() ?? eventWatermark;
  } else {
    // Window fully consumed (no_episodes, or normal completion).
    nextWatermark = windowEnd;
  }

  // Never regress below the current watermark.
  // Guard against Invalid Date from a corrupt last_event_timestamp — NaN comparisons
  // always return false, so an Invalid Date would bypass the clamp and be returned.
  if (Number.isNaN(nextWatermark.getTime())) return eventWatermark;
  return nextWatermark < eventWatermark ? eventWatermark : nextWatermark;
};
