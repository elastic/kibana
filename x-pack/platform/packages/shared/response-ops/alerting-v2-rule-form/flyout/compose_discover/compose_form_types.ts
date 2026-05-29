/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind, RecoveryPolicyType } from '@kbn/alerting-v2-schemas';
import type { RuleNotificationsValue } from '../../form/types';

// ---------------------------------------------------------------------------
// RuleQuery — the new composed/standalone query schema (#268984).
//
// This is the canonical query shape for the Compose Discover flyout.
// When the old standalone form is deleted, these types move to form/types.ts
// and replace evaluation + recoveryPolicy entirely.
// ---------------------------------------------------------------------------

export interface ComposedQuery {
  format: 'composed';
  base: string;
  blocks: {
    breach: string;
    recover?: string;
  };
}

export interface StandaloneQuery {
  format: 'standalone';
  /** Corollary of `base` in `ComposedQuery` — the "no data" base query. Maps to `evaluation.query.no_data` in the API schema. */
  no_data?: string;
  breach: string;
  recover?: string;
}

export type RuleQuery = ComposedQuery | StandaloneQuery;

export function getBreachQuery(query: RuleQuery | undefined): string {
  if (!query) return '';
  if (query.format === 'standalone') return query.breach;
  return [query.base, query.blocks.breach].filter(Boolean).join('\n');
}

export function getRecoverQuery(query: RuleQuery | undefined): string {
  if (!query) return '';
  if (query.format === 'standalone') return query.recover ?? '';
  if (!query.blocks.recover) return '';
  return [query.base, query.blocks.recover].filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------------
// ComposeFormValues — the form shape used by the Compose Discover flyout.
//
// Copied from form/types.ts FormValues with evaluation + recoveryPolicy
// replaced by query: RuleQuery. Shared field types (RuleMetadata, etc.)
// are inlined here so this file is fully self-contained and the old form
// types can be deleted without touching this file.
// ---------------------------------------------------------------------------

export interface ComposeRuleArtifact {
  id: string;
  type: string;
  value: string;
}

export interface ComposeFormValues {
  kind: RuleKind;
  metadata: {
    name: string;
    enabled: boolean;
    description?: string;
    owner?: string;
    tags?: string[];
  };
  timeField: string;
  schedule: {
    every: string;
    lookback: string;
  };
  query: RuleQuery;
  grouping?: { fields: string[] };
  stateTransition?: {
    pendingCount?: number | null;
    pendingTimeframe?: string | null;
    recoveringCount?: number | null;
    recoveringTimeframe?: string | null;
  };
  stateTransitionAlertDelayMode: 'immediate' | 'breaches' | 'recoveries' | 'duration';
  stateTransitionRecoveryDelayMode: 'immediate' | 'breaches' | 'recoveries' | 'duration';
  notifications?: RuleNotificationsValue;
  artifacts?: ComposeRuleArtifact[];
  runbookArtifacts?: ComposeRuleArtifact[];
  dashboardArtifacts?: ComposeRuleArtifact[];
}

// Re-export for use by compose mappers
export type { RuleKind, RecoveryPolicyType };
