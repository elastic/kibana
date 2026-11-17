/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MB = 1024 * 1024;

/**
 * Tuning of `capacity: auto`. These were calibrated by benchmarking memory-heavy
 * background tasks and are deliberately not configuration: only `min_capacity`
 * and `max_capacity` are exposed to the operator. Every value is reported under
 * `adaptive_capacity.settings` in the health API.
 */
export const ADAPTIVE_CAPACITY = {
  /** Share of the heap limit that running tasks may occupy before claiming stops. */
  heapTargetRatio: 0.75,
  /** Heap assumed per run for a task of a type that has not run yet, whatever its cost. */
  defaultBytesPerTask: 128 * MB,
  /** Largest capacity increase between two decisions; decreases are immediate. */
  maxIncreasePerDecision: 5,
  /** How often the controller samples the heap between claims. */
  decisionIntervalMs: 1000,
  /** Runs estimated at or below this many bytes are admitted against capacity only, not the heap budget. */
  lightTaskBytes: 8 * MB,
  /** Normal-cost slots kept open for light runs while the heap budget is exhausted. */
  lightTaskSlots: 10,
  /** Share of the container memory limit the resident set may reach before claiming stops. */
  memoryTargetRatio: 0.85,
} as const;
