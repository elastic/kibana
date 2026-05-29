/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Monotonic clock helpers for dispatcher telemetry.
 *
 * Tick and per-stage durations share the same monotonic clock
 * (`process.hrtime.bigint()`) so they are immune to NTP jumps and their
 * sums are directly comparable. Everything in this module returns values
 * rounded/shaped for the `DispatcherStageTiming.duration_ms` contract.
 */

/** Origin timestamp for a later `elapsedMs` call. */
export function startHrtime(): bigint {
  return process.hrtime.bigint();
}

/** Milliseconds elapsed since `origin` (fractional, unrounded). */
export function elapsedMs(origin: bigint): number {
  return Number(process.hrtime.bigint() - origin) / 1_000_000;
}

/** Round to 3 decimal places — the resolution contract for `duration_ms`. */
export function roundMs(value: number): number {
  return Math.round(value * 1000) / 1000;
}
