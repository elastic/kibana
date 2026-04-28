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

export interface BulkCreateRulesResult<Params extends RuleParams = never> {
  rules: Array<SanitizedRule<Params>>;
  errors: BulkOperationError[];
  total: number;
}
