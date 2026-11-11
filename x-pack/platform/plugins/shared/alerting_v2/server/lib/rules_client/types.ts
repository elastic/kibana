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
  BulkCreateRulesParams,
  BulkCreateRulesResponse,
  BulkResponse,
  CreateRuleData,
  DryRunResponse,
  FindRulesResponse,
  FindRulesSortField,
  PolicyMatcher,
  RuleResponse,
  UpdateRuleData,
} from '@kbn/alerting-v2-schemas';
import type { SavedObjectReference } from '@kbn/core/server';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import type { EventOriginActor } from '../event_origin/origin_schemas';

/** Options an in-process caller passes when it asks for a rules client. */
export interface CreateRulesClientOptions {
  /**
   * The app making changes through this client, carried on every rule event.
   * Takes precedence over the app derived from the request.
   */
  app?: string;
}

/**
 * The event-origin inputs the rules client resolves as a single dependency: the
 * acting principal (`user` / `internal`, from the request scope) folded together
 * with the caller's client options.
 */
export interface RulesClientEventOrigin {
  actor: EventOriginActor;
  options: CreateRulesClientOptions;
}
/** Re-exported from the shared schemas package. */
export type {
  BulkByIdsParams,
  BulkByQueryParams,
  BulkByQueryResult,
  BulkCreateRulesParams,
  BulkCreateRulesResponse,
  BulkResponse,
  CreateRuleData,
  DryRunResponse,
  FindRulesResponse,
  FindRulesSortField,
  RuleResponse,
  UpdateRuleData,
};

export type BulkOperationError = BulkResponse['errors'][number];

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
    /** The rule template this rule is created from. */
    template?: { id: string };
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

export interface FindMatchingRulesArgs {
  matcher?: PolicyMatcher | null;
  page?: number;
  perPage?: number;
}

export interface UpdateRuleParams {
  id: string;
  data: UpdateRuleData;
}
