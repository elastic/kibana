/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind } from '@kbn/alerting-v2-schemas';
import type { StateTransitionDelayMode } from '../../form/types';

// ---------------------------------------------------------------------------
// Query types — mirrors the API's Query discriminated union so the flyout
// works directly with the new schema. Defined locally to avoid importing
// from form/types which still uses the legacy evaluation/recoveryPolicy shape.
// ---------------------------------------------------------------------------

export interface ComposedRuleQuery {
  format: 'composed';
  base: string;
  blocks: {
    breach: string;
    recover?: string;
  };
}

export interface StandaloneRuleQuery {
  format: 'standalone';
  breach: string;
  recover?: string;
}

export type RuleQuery = ComposedRuleQuery | StandaloneRuleQuery;

/** Returns the effective breach ES|QL query string. */
export const getBreachQuery = (query: RuleQuery): string =>
  query.format === 'composed'
    ? query.base.trimEnd() + query.blocks.breach.trimEnd()
    : query.breach.trimEnd();

/** Returns the recovery ES|QL query string, or undefined if not configured. */
export const getRecoverQuery = (query: RuleQuery): string | undefined => {
  if (query.format === 'composed' && query.blocks.recover) {
    return query.base.trimEnd() + query.blocks.recover.trimEnd();
  }
  if (query.format === 'standalone' && query.recover) {
    return query.recover.trimEnd();
  }
  return undefined;
};

// ---------------------------------------------------------------------------
// ComposeFormValues — the flyout's internal form type.
// Uses the new query schema directly; independent of the standalone form's
// legacy FormValues to avoid coupling to its evaluation/recoveryPolicy shape.
// ---------------------------------------------------------------------------

export interface ComposeRuleMetadata {
  name: string;
  enabled: boolean;
  description?: string;
  owner?: string;
  tags?: string[];
}

export interface ComposeRuleSchedule {
  every: string;
  lookback: string;
}

export interface ComposeRuleGrouping {
  fields: string[];
}

export interface ComposeRuleArtifact {
  id: string;
  type: string;
  value: string;
}

export interface ComposeStateTransition {
  pendingCount?: number | null;
  pendingTimeframe?: string | null;
  recoveringCount?: number | null;
  recoveringTimeframe?: string | null;
}

export interface ComposeFormValues {
  kind: RuleKind;
  metadata: ComposeRuleMetadata;
  timeField: string;
  schedule: ComposeRuleSchedule;
  query: RuleQuery;
  grouping?: ComposeRuleGrouping;
  stateTransition?: ComposeStateTransition;
  stateTransitionAlertDelayMode: StateTransitionDelayMode;
  stateTransitionRecoveryDelayMode: StateTransitionDelayMode;
  artifacts?: ComposeRuleArtifact[];
}
