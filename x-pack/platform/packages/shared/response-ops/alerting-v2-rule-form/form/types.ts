/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind, RecoveryStrategy, NoDataStrategy } from '@kbn/alerting-v2-schemas';
import type { ActionFormValue } from '../actions_form';

export type { RuleKind, RecoveryStrategy, NoDataStrategy };

/** Alert / recovery delay segment control (matches `AlertDelayField` / `RecoveryDelayField`). */
export const DELAY_MODE = {
  immediate: 'immediate',
  breaches: 'breaches',
  recoveries: 'recoveries',
  duration: 'duration',
} as const;

export type StateTransitionDelayMode = (typeof DELAY_MODE)[keyof typeof DELAY_MODE];

// ---------------------------------------------------------------------------
// Query / recovery / no-data — form mirrors of the API blocks.
// ---------------------------------------------------------------------------

/** Form state mirrors the API shape but keeps `breach.segment` always present; '' means "no breach condition". */
export interface RuleQuery {
  base: string;
  breach: { segment: string };
}

/**
 * Widened form state for the API's `recovery` discriminated union: RHF cannot
 * narrow a union in place, so every member's field is kept and the mapper
 * projects the one the strategy needs.
 */
export interface RuleRecovery {
  strategy: RecoveryStrategy;
  segment?: string;
  query?: string;
}

/** Widened form state for the API's `no_data` discriminated union. */
export interface RuleNoData {
  strategy: NoDataStrategy;
  query?: string;
}

// ---------------------------------------------------------------------------
// Shared sub-types
// ---------------------------------------------------------------------------

export interface RuleMetadata {
  name: string;
  enabled: boolean;
  description?: string;
  owner?: string;
  tags?: string[];
}

export interface RuleSchedule {
  every: string;
  lookback: string;
}

export interface RuleGrouping {
  fields: string[];
}

export interface RuleArtifact {
  id: string;
  type: string;
  data: Record<string, any>;
}

export interface RuleNotificationsValue {
  workflows: ActionFormValue;
}

export interface StateTransition {
  pendingCount?: number | null;
  pendingTimeframe?: string | null;
  recoveringCount?: number | null;
  recoveringTimeframe?: string | null;
}

// ---------------------------------------------------------------------------
// FormValues — the single canonical form type for rule creation/editing.
//
// Matches the API schema structurally (same blocks, same field semantics).
// Only diverges in casing (camelCase for RHF), in widening the `recovery` and
// `no_data` unions so RHF can hold a partially-filled member, and in UI-only
// fields (delay modes, metadata.enabled, split artifact arrays).
// ---------------------------------------------------------------------------

export interface FormValues {
  kind: RuleKind;
  metadata: RuleMetadata;
  timeField: string;
  schedule: RuleSchedule;
  query: RuleQuery;
  recovery?: RuleRecovery;
  noData?: RuleNoData;
  grouping?: RuleGrouping;
  stateTransition?: StateTransition;
  stateTransitionAlertDelayMode: StateTransitionDelayMode;
  stateTransitionRecoveryDelayMode: StateTransitionDelayMode;
  artifacts?: RuleArtifact[];
  notifications?: RuleNotificationsValue;
  runbookArtifacts?: RuleArtifact[];
  dashboardArtifacts?: RuleArtifact[];
}
