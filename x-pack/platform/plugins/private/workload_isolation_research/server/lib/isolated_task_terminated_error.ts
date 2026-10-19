/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type StopReason = 'deadline' | 'cancelled' | 'shutdown';

/** Reports confirmed class-pool termination, never merely an abort request. */
export class IsolatedTaskTerminatedError extends Error {
  public readonly reason: StopReason;
  public readonly discardedRuns: readonly string[];
  public readonly collateral: boolean;

  constructor(reason: StopReason, discardedRuns: readonly string[], collateral: boolean) {
    super(`Isolated task class stopped: ${reason}`);
    this.name = 'IsolatedTaskTerminatedError';
    this.reason = reason;
    this.discardedRuns = discardedRuns;
    this.collateral = collateral;
  }
}
