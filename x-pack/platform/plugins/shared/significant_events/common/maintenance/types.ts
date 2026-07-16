/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsMaintenanceState } from './state_machine';

/** A single target that could not be processed during a state transition. */
export interface SignificantEventsMaintenanceFailure {
  /**
   * Prefixed identifier of what failed, e.g. `workflow:<id>@<space>`,
   * `rule:<id>`, `execution:<id>@<space>`, `execution-backlog:<workflow>@<space>`,
   * `spaces`, `workflows`, `rules`, or `reassert`.
   */
  target: string;
  error: string;
}

/**
 * Structured result of a state transition (or the last pause/reassert snapshot).
 * While `state` is `paused`, `workflowsDisabled` / `rulesDisabled` are the
 * sizes of the current disabled snapshots (not only the last sweep’s deltas),
 * and `executionsCancelled` accumulates across re-pauses. On a successful
 * resume those counts are zero. On an incomplete resume they keep the prior
 * pause counts so the UI still shows what Pause turned off.
 */
export interface SignificantEventsMaintenanceSummary {
  state: SignificantEventsMaintenanceState;
  executionsCancelled: number;
  workflowsDisabled: number;
  rulesDisabled: number;
  partialFailures: SignificantEventsMaintenanceFailure[];
}

/** Persisted, UI-facing maintenance state. */
export interface SignificantEventsMaintenanceStatus {
  state: SignificantEventsMaintenanceState;
  /** When the current state was entered. */
  updatedAt?: string;
  /** Who last changed the state. */
  updatedBy?: string;
  lastSummary?: SignificantEventsMaintenanceSummary;
}
