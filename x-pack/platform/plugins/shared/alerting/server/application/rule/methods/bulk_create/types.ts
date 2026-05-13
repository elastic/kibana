/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { IntervalSchedule } from '../../../../../common';
import type { RuleParams } from '../../types';
import type { CreateRuleData } from '../create/types';
import type { CreateRuleOptions } from '../create/create_rule';
import type { BulkOperationError, RulesClientContext } from '../../../../rules_client/types';
import type { RawRule, SanitizedRule } from '../../../../types';

export interface PreparedRule {
  id: string;
  name: string;
  enabled: boolean;
  rawRule: RawRule;
  references: SavedObjectReference[];
  schedule: IntervalSchedule;
  consumer: string;
  ruleTypeId: string;
}

export interface ApiKeyEntry {
  apiKey: string | null;
  uiamApiKey: string | null;
  apiKeyCreatedByUser: boolean | null;
}

export interface PrepareRuleArgs<Params extends RuleParams> {
  context: RulesClientContext;
  actionsClient: Awaited<ReturnType<RulesClientContext['getActionsClient']>>;
  username: string | null;
  id: string;
  rule: BulkCreateRulesItem<Params>;
  authzCache: Map<string, Promise<void>>;
  errors: BulkCreateOperationError[];
  apiKeysMap: Map<string, ApiKeyEntry>;
}

export interface BulkCreateRulesItem<Params extends RuleParams = never> {
  data: CreateRuleData<Params>;
  options?: CreateRuleOptions;
  allowMissingConnectorSecrets?: boolean;
}

export interface BulkCreateRulesParams<Params extends RuleParams = never> {
  rules: Array<BulkCreateRulesItem<Params>>;
  // If true, skip Phase 5 (taskManager.bulkEnable);
  skipTaskEnabling?: boolean;
}

export type BulkCreateDisabledReason =
  | 'api_key_creation_failed'
  | 'schedule_limit_exceeded'
  | 'task_schedule_failed'
  | 'task_validation_failed';

export interface BulkCreateOperationError extends BulkOperationError {
  disabledReason?: BulkCreateDisabledReason;
}

export interface BulkCreateRulesResult<Params extends RuleParams = never> {
  rules: Array<SanitizedRule<Params>>;
  errors: BulkCreateOperationError[];
  total: number;
  taskIdsFailedToBeEnabled: string[];
}
