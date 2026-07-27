/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionPolicyResponse,
  CreateActionPolicyDataInput,
  MatchedActionPolicy,
  UpdateActionPolicyData,
} from '@kbn/alerting-v2-schemas';

export interface UpdateActionPolicyParams {
  data: UpdateActionPolicyData;
  options: { id: string; version: string };
}

export interface CreateActionPolicyParams {
  data: CreateActionPolicyDataInput;
  options?: { id?: string };
}

export interface SnoozeActionPolicyParams {
  id: string;
  snoozedUntil: string;
}

export interface UpdateActionPolicyApiKeyParams {
  id: string;
}

/** Body shared by the by-ID action-policy bulk endpoints (delete/enable/disable/unsnooze/update_api_key). */
export interface BulkActionPoliciesByIdsParams {
  ids: string[];
}

/** Body for the bulk snooze endpoint: the by-ID batch plus a shared expiry. */
export interface BulkSnoozeActionPoliciesParams {
  ids: string[];
  snoozedUntil: string;
}

export type FindActionPoliciesSortField = 'name' | 'createdAt' | 'updatedAt';

export interface FindActionPoliciesParams {
  page?: number;
  perPage?: number;
  search?: string;
  enabled?: boolean;
  tags?: string[];
  sortField?: FindActionPoliciesSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface FindActionPoliciesResponse {
  items: ActionPolicyResponse[];
  total: number;
  page: number;
  perPage: number;
}

export interface MatchActionPoliciesForRuleParams {
  ruleId?: string;
  ruleName?: string;
  ruleTags?: string[];
}

export interface MatchActionPoliciesForRuleResponse {
  items: MatchedActionPolicy[];
  total: number;
}
