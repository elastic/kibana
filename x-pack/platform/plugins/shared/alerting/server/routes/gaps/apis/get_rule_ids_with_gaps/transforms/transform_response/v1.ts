/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetRuleIdsWithGapsResponse } from '../../../../../../application/rule/methods/get_rule_ids_with_gaps/types';
import { GetRuleIdsWithGapResponseBodyV1 } from '../../../../../../../common/routes/gaps/apis/get_rules_with_gaps';

export const transformResponse = (
  response: GetRuleIdsWithGapsResponse
): GetRuleIdsWithGapResponseBodyV1 => ({
  total: response.total,
  rule_ids: response.ruleIds,
});
