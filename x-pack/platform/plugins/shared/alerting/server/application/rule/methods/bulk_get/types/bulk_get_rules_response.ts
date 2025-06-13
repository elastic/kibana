/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule, SanitizedRuleWithLegacyId } from '../../../../../types';
import type { RuleParams } from '../../../types';

export interface BulkGetRulesResponse<Params extends RuleParams = never> {
  rules: Array<SanitizedRule<Params> | SanitizedRuleWithLegacyId<Params>>;
  errors: Array<{ id: string; error: { message: string; statusCode?: number } }>;
}
