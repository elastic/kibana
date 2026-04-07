/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlRule } from '@kbn/agent-builder-common';

/**
 * The body payload for creating or updating an SML rule.
 */
export type SmlRuleCreateBody = Omit<SmlRule, 'id' | 'created_at' | 'updated_at'>;

export type GetSmlRuleResponse = SmlRule;

export interface ListSmlRulesResponse {
  results: SmlRule[];
}

export type CreateOrUpdateSmlRuleResponse = SmlRule;

export interface DeleteSmlRuleResponse {
  success: boolean;
}
