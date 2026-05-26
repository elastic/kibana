/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkEnableRulesResult } from '../../../../../../application/rule/methods/bulk_enable/types';
import { transformRuleToRuleResponseInternalV1 } from '../../../../transforms';
import type { Rule, RuleParams } from '../../../../../../application/rule/types';

export const transformBulkEnableResponseInternal = <Params extends RuleParams = never>(
  response: BulkEnableRulesResult<Params>
) => {
  return {
    rules: response.rules.map((rule) =>
      transformRuleToRuleResponseInternalV1<Params>(rule as Rule)
    ),
    errors: response.errors,
    total: response.total,
    task_ids_failed_to_be_enabled: response.taskIdsFailedToBeEnabled,
  };
};
