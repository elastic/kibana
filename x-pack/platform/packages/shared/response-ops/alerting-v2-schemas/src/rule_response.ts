/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind } from './rule_data_schema';

/**
 * API response for a single rule.
 *
 * Defined independently of CreateRuleData so the response shape can diverge
 * from the input shape (e.g. computed fields, server-managed state).
 */
export interface RuleResponse {
  id: string;
  kind: RuleKind;
  metadata: {
    name: string;
    owner?: string;
    labels?: string[];
  };
  time_field: string;
  schedule: {
    every: string;
    lookback?: string;
  };
  evaluation: {
    query: {
      base: string;
      condition: string;
    };
  };
  recovery_policy?: {
    type: 'query' | 'no_breach';
    query?: {
      base?: string;
      condition?: string;
    };
  };
  state_transition?: {
    pending_operator?: 'AND' | 'OR';
    pending_count?: number;
    pending_timeframe?: string;
    recovering_operator?: 'AND' | 'OR';
    recovering_count?: number;
    recovering_timeframe?: string;
  };
  grouping?: {
    fields: string[];
  };
  no_data?: {
    behavior?: 'no_data' | 'last_status' | 'recover';
    timeframe?: string;
  };
  notification_policies?: Array<{ ref: string }>;
  enabled: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}
