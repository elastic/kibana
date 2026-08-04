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
   * `rule:<id>`, `execution:<id>@<space>`, `spaces`, `workflows`, `rules`,
   * or `reassert`.
   */
  target: string;
  error: string;
}

/**
 * Structured result of a state transition (or the last pause/reassert snapshot).
 * While `state` is `paused`, `workflowsDisabled` / `rulesDisabled` are the
 * sizes of the current disabled snapshots (not only the last sweep’s deltas).
 * `executionsCancelled` is reserved for compatibility and is always 0 — pause
 * cancels in-flight work best-effort without returning a count. On a successful
 * resume workflow/rule counts are zero. On an incomplete resume they reflect
 * what is still recorded as disabled after the resume attempt.
 */
export interface SignificantEventsMaintenanceSummary {
  state: SignificantEventsMaintenanceState;
  executionsCancelled: number;
  workflowsDisabled: number;
  rulesDisabled: number;
  partialFailures: SignificantEventsMaintenanceFailure[];
}

/**
 * Live feature-toggle values for the caller's space. Used by the Settings UI
 * to stay in sync after Pause turns toggles off and Resume restores only those
 * that were previously enabled.
 */
export interface SignificantEventsMaintenanceFeatureSettings {
  continuousOnboardingEnabled: boolean;
  scheduledDiscoveryEnabled: boolean;
}

/** Persisted, UI-facing maintenance state. */
export interface SignificantEventsMaintenanceStatus {
  state: SignificantEventsMaintenanceState;
  /** When the current state was entered. */
  updatedAt?: string;
  /** Who last changed the state. */
  updatedBy?: string;
  lastSummary?: SignificantEventsMaintenanceSummary;
  /** Current continuous / scheduled discovery toggle values (caller space). */
  featureSettings?: SignificantEventsMaintenanceFeatureSettings;
  /**
   * True when live feature-toggle values could not be read. Callers should not
   * treat a missing `featureSettings` as "still enabled".
   */
  featureSettingsUnavailable?: boolean;
}
