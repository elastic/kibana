/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkByIdsParams,
  BulkByQueryParams,
  BulkByQueryResult,
  BulkResponse,
  CreateRuleData,
  DryRunResponse,
  FindRulesResponse,
  FindRulesSortField,
  RuleResponse,
  UpdateRuleData,
} from '@kbn/alerting-v2-schemas';
import type { SavedObjectReference } from '@kbn/core/server';
import type { RuleSavedObjectAttributes } from '../../saved_objects';

/** Re-exported from the shared schemas package. */
export type {
  BulkByIdsParams,
  BulkByQueryParams,
  BulkByQueryResult,
  BulkResponse,
  CreateRuleData,
  DryRunResponse,
  FindRulesResponse,
  FindRulesSortField,
  RuleResponse,
  UpdateRuleData,
};

export type BulkOperationError = BulkResponse['errors'][number];

/**
 * Create data whose builder metadata has been normalised and whose `query` has
 * been settled. For write-time builder rules and plain ES|QL rules, `query` is
 * always present (generated or supplied). For execution-time builder rules,
 * `query` is absent — they compile a query on every run.
 *
 * Ref: rule-execution-logic.md "A rule without a persisted query"
 */
export type ResolvedCreateRuleData = CreateRuleData;

/**
 * Update data whose builder metadata has been normalized and whose `query` has
 * been regenerated if the builder fields changed.
 */
export type ResolvedUpdateRuleData = UpdateRuleData;

/** An enabled rule whose executor task API key is a candidate for rotation. */
export interface RotationCandidate {
  id: string;
  taskId: string;
  attrs: RuleSavedObjectAttributes;
  version?: string;
  references: SavedObjectReference[];
}

export interface CreateRuleParams {
  data: CreateRuleData;
  options?: { id?: string };
}

export interface FindRulesArgs {
  page?: number;
  perPage?: number;
  filter?: string;
  search?: string;
  sortField?: FindRulesSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateRuleParams {
  id: string;
  data: UpdateRuleData;
  options?: { version?: string };
}
