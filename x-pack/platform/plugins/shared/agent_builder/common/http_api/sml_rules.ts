/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Supported SML type values for the `{type}` path parameter.
 * Only `index` is supported in v1.
 */
export const SML_RULE_TYPES = ['index'] as const;
export type SmlRuleType = (typeof SML_RULE_TYPES)[number];

/**
 * A variable definition attached to an SML rule.
 * Only ES|QL query-based variables are supported.
 */
export interface SmlRuleVariable {
  type: 'esql';
  input: string;
}

/**
 * An SML rule as returned by the HTTP API.
 */
export interface SmlRule {
  id: string;
  name: string;
  type: SmlRuleType;
  index_pattern: string;
  prompt?: string;
  inference_id: string;
  variables?: Record<string, SmlRuleVariable>;
  created_at: string;
  updated_at: string;
}

// -- Response types ----------------------------------------------------------

export type GetSmlRuleResponse = SmlRule;

export interface ListSmlRulesResponse {
  results: SmlRule[];
}

export type CreateOrUpdateSmlRuleResponse = SmlRule;

export interface DeleteSmlRuleResponse {
  success: boolean;
}
