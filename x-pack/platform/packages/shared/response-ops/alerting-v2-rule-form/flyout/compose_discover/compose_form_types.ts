/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind } from '@kbn/alerting-v2-schemas';

// ---------------------------------------------------------------------------
// RuleQuery — the composed/standalone query schema.
//
// This is the canonical query shape for the Compose Discover flyout.
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
// ---------------------------------------------------------------------------

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
  artifacts?: Array<{ id: string; type: string; value: string }>;
}

// Re-export for use by compose mappers
export type { RuleKind };
