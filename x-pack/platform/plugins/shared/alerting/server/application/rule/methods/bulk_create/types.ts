/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '../../../../types';
import type { RuleParams } from '../../types';
import type { CreateRuleData } from '../create/types';
import type { CreateRuleOptions } from '../create/create_rule';
import type { BulkOperationError } from '../../../../rules_client/types';

export interface BulkCreateRulesItem<Params extends RuleParams = never> {
  data: CreateRuleData<Params>;
  options?: CreateRuleOptions;
  allowMissingConnectorSecrets?: boolean;
}

export interface BulkCreateRulesParams<Params extends RuleParams = never> {
  rules: Array<BulkCreateRulesItem<Params>>;
}

/**
 * Lets callers branch on *why* a rule was created as disabled.
 */
export type BulkCreateDisabledReason =
  | 'api_key_creation_failed'
  | 'schedule_limit_exceeded'
  | 'task_schedule_failed'
  | 'task_schedule_entry_failed';

export interface BulkCreateOperationError extends BulkOperationError {
  disabledReason?: BulkCreateDisabledReason;
}

export interface BulkCreateRulesResult<Params extends RuleParams = never> {
  rules: Array<SanitizedRule<Params>>;
  errors: BulkCreateOperationError[];
  total: number;
  /**
   * Promise that resolves when the detached post-create work finishes:
   *   - Task scheduling
   *   - Failure recovery: rule SO enabled -> disabled.
   *   - API key invalidations
   */
  backgroundWork: Promise<BulkCreateOperationError[]>;
}
