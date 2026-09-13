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
  Query,
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

/**
 * Per-rule builder fields validation result. Attached to read responses when
 * the caller opts in via `validateBuilderFields` on `getRule` or `findRules`.
 * An unregistered builder type is reported as an ordinary error, not thrown.
 *
 * Ref: rule-validation.md "Read-path validation: off by default, opt-in per call"
 */
export interface BuilderFieldsValidation {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
}

/**
 * Single-rule result type. Extends `RuleResponse` with an optional validation
 * attachment present only when the caller passes `validateBuilderFields: true`
 * on `getRule`.
 */
export type GetRuleResult = RuleResponse & {
  builder_fields_validation?: BuilderFieldsValidation;
};

/**
 * Multi-rule result type. Mirrors `FindRulesResponse` but with items typed as
 * `GetRuleResult[]` so per-rule validation can be attached when the caller
 * passes `validateBuilderFields: true` on `findRules`.
 */
export interface FindRulesResult {
  items: GetRuleResult[];
  total: FindRulesResponse['total'];
  page: FindRulesResponse['page'];
  per_page: FindRulesResponse['per_page'];
}

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
 *
 * Extends `UpdateRuleData` to allow `query: null` as a sentinel that tells
 * `buildUpdateRuleAttributes` to clear any previously stored query. This is
 * needed for execution-time builder rules: when a PATCH switches a rule to an
 * execution-time type, the old compiled query (if any) must not be preserved in
 * the saved object. `null` is normalised to `undefined` (absent SO attribute) by
 * `buildUpdateRuleAttributes` and never reaches storage or the response schema.
 *
 * Ref: rule-execution-logic.md "A rule without a persisted query"
 */
export type ResolvedUpdateRuleData = Omit<UpdateRuleData, 'query'> & { query?: Query | null };

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
  options?: {
    id?: string;
    /**
     * When false, the builder schema parse and `validateFields` hook are
     * skipped. The wire schema always runs. For in-process callers only;
     * the framework's HTTP routes never pass this.
     *
     * Ref: rule-validation.md "Write-path validation: on by default, opt-out per call"
     */
    validateBuilderFields?: boolean;
  };
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
  options?: {
    version?: string;
    /**
     * When false, the builder schema parse and `validateFields` hook are
     * skipped. The wire schema always runs. For in-process callers only;
     * the framework's HTTP routes never pass this.
     *
     * Ref: rule-validation.md "Write-path validation: on by default, opt-out per call"
     */
    validateBuilderFields?: boolean;
  };
}
