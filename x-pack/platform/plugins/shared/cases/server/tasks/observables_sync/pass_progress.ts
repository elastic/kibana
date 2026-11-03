/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservablesSyncCounts } from './types';

/** The progress of the pass that the phases of one run add to. */
export class PassProgress {
  public phaseFailures: number;
  public rescanNeeded: boolean;
  public scanned = 0;

  constructor(
    public readonly counts: ObservablesSyncCounts,
    { phaseFailures, rescanNeeded }: { phaseFailures: number; rescanNeeded: boolean }
  ) {
    this.phaseFailures = phaseFailures;
    this.rescanNeeded = rescanNeeded;
  }

  /** A failing case could not be flagged pending, so the pass has to start over instead of completing. */
  public requireRescan(): void {
    this.rescanNeeded = true;
  }
}
