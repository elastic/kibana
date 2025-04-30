/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTagsRequestQueryV1 } from '../../../../../../../common/routes/rule/apis/tags';
import type { RuleTagsParams } from '../../../../../../application/rule/methods/tags';

export const transformRuleTagsQueryRequest = ({
  per_page: perPage,
  page,
  search,
  rule_type_ids: ruleTypeIds,
}: RuleTagsRequestQueryV1): RuleTagsParams => ({
  page,
  search,
  perPage,
  ...(ruleTypeIds ? { ruleTypeIds: Array.isArray(ruleTypeIds) ? ruleTypeIds : [ruleTypeIds] } : {}),
});
