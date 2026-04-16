/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildApiRulesListCombinedFilter } from '../../../common/utils/build_rules_list_kql';
import { buildRuleSoFilter } from './build_rule_filter';

export { buildRuleSearchQuery } from '../../../common/utils/build_rules_list_kql';

export const buildFindRulesSearch = ({
  filter,
  search,
}: {
  filter?: string;
  search?: string;
}): string | undefined => {
  const combinedQuery = buildApiRulesListCombinedFilter({ filter, search });
  return combinedQuery ? buildRuleSoFilter(combinedQuery) : undefined;
};
