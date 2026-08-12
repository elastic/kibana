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
 * - Halted with no_episodes or no_actions: advance to windowEnd (window fully consumed).
 * - Truncated (row count === EPISODE_QUERY_LIMIT): advance to the last fetched
 *   episode's timestamp (the truncation edge); the deferred tail is re-read next tick.
 * - Completed normally: advance to windowEnd.
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
  } else if (haltReason === 'no_episodes' || haltReason === 'no_actions') {
    // Window fully scanned with nothing to do; advance to consume it.
    nextWatermark = windowEnd;
  } else if (finalState.truncated) {
    // EPISODE_QUERY_LIMIT hit: episodes arrive sorted asc by last_event_timestamp,
    // so the last element is the truncation edge. Advance there; the tail will be
    // re-read from eventWatermark - OVERLAP on the next tick.
    const lastEpisode = finalState.episodes?.[finalState.episodes.length - 1];
    nextWatermark = lastEpisode ? new Date(lastEpisode.last_event_timestamp) : eventWatermark;
  } else {
    // Normal completion: window fully dispatched.
    nextWatermark = windowEnd;
  }

  // Never regress below the current watermark.
  return nextWatermark < eventWatermark ? eventWatermark : nextWatermark;
};
