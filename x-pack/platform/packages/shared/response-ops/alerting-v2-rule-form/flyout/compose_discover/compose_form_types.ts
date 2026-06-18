/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind } from '@kbn/alerting-v2-schemas';
import type { RuleNotificationsValue } from '../../form/types';

// ---------------------------------------------------------------------------
// RuleQuery — the composed/standalone query schema.
//
// This is the canonical query shape for the Compose Discover flyout.
// ---------------------------------------------------------------------------

export interface ComposedQuery {
  format: 'composed';
  base: string;
  breach: { segment: string };
  recovery?: { segment: string };
}

export interface StandaloneQuery {
  format: 'standalone';
  /** Corollary of `base` in `ComposedQuery` — the "no data" base query. Maps to `query.no_data` in the API schema. */
  no_data?: { query: string };
  breach: { query: string };
  recovery?: { query: string };
}

export type RuleQuery = ComposedQuery | StandaloneQuery;

/** Strip leading pipes so composed segments can be joined with a single `| `. */
function normalizeComposedSegment(segment: string): string {
  return segment.trim().replace(/^\|+\s*/, '');
}

function joinComposedQuery(base: string, segment: string): string {
  const trimmedBase = base.trim();
  const normalizedSegment = normalizeComposedSegment(segment);

  if (!trimmedBase) {
    return normalizedSegment;
  }
  if (!normalizedSegment) {
    return trimmedBase;
  }
  return `${trimmedBase}\n| ${normalizedSegment}`;
}

export function getBreachQuery(query: RuleQuery | undefined): string {
  if (!query) return '';
  if (query.format === 'standalone') return query.breach.query;
  return joinComposedQuery(query.base, query.breach.segment);
}

/** True when the rule has any ES|QL content in the breach (alert) pipeline. */
export function isQueryDefined(query: RuleQuery | undefined): boolean {
  return Boolean(getBreachQuery(query).trim());
}

export function getRecoverQuery(query: RuleQuery | undefined): string {
  if (!query) return '';
  if (query.format === 'standalone') return query.recovery?.query ?? '';
  if (!query.recovery?.segment) return '';
  return joinComposedQuery(query.base, query.recovery.segment);
}

// ---------------------------------------------------------------------------
// ComposeFormValues — the form shape used by the Compose Discover flyout.
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
export type { RuleKind };
