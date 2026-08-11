/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRuleTemplatesRequestQueryV1 } from '../../../../../../common/routes/rule_template/apis/find';
import type { FindRuleTemplatesParams } from '../../../../../application/rule_template/methods/find/types';

export const transformFindRuleTemplatesQueryV1 = (
  query: FindRuleTemplatesRequestQueryV1
): FindRuleTemplatesParams => ({
  perPage: query.per_page,
  page: query.page,
  search: query.search,
  defaultSearchOperator: query.default_search_operator,
  sortField: query.sort_field,
  sortOrder: query.sort_order,
  ruleTypeId: query.rule_type_id,
  tags: query.tags ? (Array.isArray(query.tags) ? query.tags : [query.tags]) : undefined,
});
