/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleParams } from '../../../types/rule';
import { SanitizedRule } from '../../../../../types';

export interface BulkEnableRulesParams {
  filter?: string;
  ids?: string[];
}

export interface BulkEnableRulesError {
  message: string;
  status?: number;
  rule: {
    id: string;
    name: string;
  };
}

// TODO (http-versioning): This should be of type Rule, change this when all rule types are fixed
export interface BulkEnableRulesResult<Params extends RuleParams> {
  rules: Array<SanitizedRule<Params>>;
  errors: BulkEnableRulesError[];
  total: number;
  taskIdsFailedToBeEnabled: string[];
}
