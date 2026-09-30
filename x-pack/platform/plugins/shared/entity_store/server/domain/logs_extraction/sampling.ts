/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT, MIN_SAMPLING_RATE } from '../saved_objects';

/** Per-slice inputs for the dynamic rate; all come from the boundary probe - no extra queries. */
export interface AdaptiveSamplingInputs {
  /** Raw logs already counted against this window, before the current slice. */
  scannedLogs: number;
  /** Probe estimate of raw logs in the current slice. */
  sliceLogCount: number;
  sliceStartISO: string;
  sliceEndISO: string;
  windowEndISO: string;
}

/**
 * Estimated raw logs from the current slice to the end of the window: the slice itself plus the
 * slice's density extrapolated over the remaining time. Assumes roughly uniform volume; bursts
 * self-correct on the next slice's estimate.
 */
const estimateRemainingLogs = ({
  sliceLogCount,
  sliceStartISO,
  sliceEndISO,
  windowEndISO,
}: AdaptiveSamplingInputs): number => {
  const sliceDurationMs = Date.parse(sliceEndISO) - Date.parse(sliceStartISO);
  const remainingMs = Math.max(0, Date.parse(windowEndISO) - Date.parse(sliceEndISO));
  // A zero/negative-duration slice has no density to extrapolate; the slice count stands alone.
  const extrapolated = sliceDurationMs > 0 ? (sliceLogCount / sliceDurationMs) * remainingMs : 0;
  return sliceLogCount + extrapolated;
};

/**
 * Dynamic sampling rate for the current slice.
 *
 * The budget is pinned to `LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT` by design - never the
 * effective configured cap. A window projected above the default always samples (the ratio drops
 * below 1 exactly then), and one projected at or below it never does (clamped to 1, so no SAMPLE
 * stage is emitted). Raising or lowering `maxLogsPerWindow` changes only the hard stop.
 */
export const computeAdaptiveSamplingRate = (inputs: AdaptiveSamplingInputs): number => {
  const estimatedRemaining = estimateRemainingLogs(inputs);
  if (estimatedRemaining <= 0) return 1;

  const remainingBudget = LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT - inputs.scannedLogs;
  return Math.min(1, Math.max(MIN_SAMPLING_RATE, remainingBudget / estimatedRemaining));
};

/**
 * Rate in effect for the current slice. A `samplingRate` override from
 * `nonPriorityLogExtractionConfig` is unconditional - the operator asked for sampling, so no
 * volume trigger applies; otherwise the rate adapts per slice via the default-pinned budget.
 */
export const resolveSamplingRate = (
  inputs: AdaptiveSamplingInputs,
  override?: number | null
): number => {
  if (override !== null && override !== undefined) {
    return Math.min(1, Math.max(MIN_SAMPLING_RATE, override));
  }
  return computeAdaptiveSamplingRate(inputs);
};
