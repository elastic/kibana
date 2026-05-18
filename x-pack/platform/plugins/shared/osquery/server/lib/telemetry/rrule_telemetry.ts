/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stubbed RRULE telemetry counters for PR A. PR C wires the route-level
 * `validateRruleConfig` rejection path into {@link recordRruleValidationRejection},
 * which lets the team measure validation failures once the feature flag flips
 * on — see `tasks.md` 1.10.
 *
 * Kept as a module-level counter rather than the EBT event surface because
 * rejections are not bound to a pack SO (the SO never landed) and emitting an
 * event per rejection would inflate telemetry volume during noisy migrations.
 */
let rruleValidationRejections = 0;

export const recordRruleValidationRejection = (): void => {
  rruleValidationRejections += 1;
};

export const getRruleValidationRejectionCount = (): number => rruleValidationRejections;

/**
 * Test-only reset. Production callers should NOT use this.
 * @internal
 */
export const __resetRruleValidationRejectionCount = (): void => {
  rruleValidationRejections = 0;
};
