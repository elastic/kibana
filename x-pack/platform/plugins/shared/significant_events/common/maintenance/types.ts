/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsMaintenanceState } from './state_machine';

/** A single target that could not be processed during a state transition. */
export interface SignificantEventsMaintenanceFailure {
  /** The workflow document id or rule id that failed. */
  target: string;
  error: string;
}

/**
 * Structured result of a state transition (e.g. pause or resume). Counts
 * describe what the transition actually changed (pause: what it
 * disabled/cancelled; resume: zero, since resume only flips `enabled` back on
 * for what pause recorded). `state` is the resulting state.
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
