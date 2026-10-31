/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MIN_SAMPLING_RATE } from '../saved_objects';

// CI trigger no-op: forces a fresh Cloud + serverless image build for PR #297920 (verifying #297688). Not for merge.

/** Per-slice inputs for the dynamic rate; all but `maxLogsPerWindow` come from the boundary probe
 * - no extra queries. */
export interface AdaptiveSamplingInputs {
  /** Raw logs already counted against this window, before the current slice. */
  scannedLogs: number;
  /** Probe estimate of raw logs in the current slice. */
  sliceLogCount: number;
  sliceStartISO: string;
  sliceEndISO: string;
  windowEndISO: string;
  /** The process's effective configured cap - already resolved by the caller through the same
   * config merge stack the hard cap uses. `0` means the hard cap is disabled. */
  maxLogsPerWindow: number;
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
 * The budget tracks the process's effective configured `maxLogsPerWindow`, the same value the
 * hard cap uses - raising or lowering it moves both the trigger and the rate together, so a
 * smaller configured cap gets graceful degradation instead of only ever hitting a hard drop, and
 * a larger one gets more headroom before sampling engages at all. `maxLogsPerWindow <= 0` means
 * the hard cap is disabled - there is no budget to protect, so sampling never activates.
 * A window projected above the budget always samples (the ratio drops below 1 exactly then), and
 * one projected at or below it never does (clamped to 1, so no SAMPLE stage is emitted).
 */
export const computeAdaptiveSamplingRate = (inputs: AdaptiveSamplingInputs): number => {
  if (inputs.maxLogsPerWindow <= 0) return 1;

  const estimatedRemaining = estimateRemainingLogs(inputs);
  if (estimatedRemaining <= 0) return 1;

  const remainingBudget = inputs.maxLogsPerWindow - inputs.scannedLogs;
  return Math.min(1, Math.max(MIN_SAMPLING_RATE, remainingBudget / estimatedRemaining));
};

/**
 * Rate in effect for the current slice. A `samplingRate` override from
 * `nonPriorityLogExtractionConfig` is unconditional - the operator asked for sampling, so no
 * volume trigger applies; otherwise the rate adapts per slice via the configured-cap budget.
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
