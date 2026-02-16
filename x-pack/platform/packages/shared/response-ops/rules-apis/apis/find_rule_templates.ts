/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { AsApiContract } from '@kbn/actions-types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../constants';

export interface FindRuleTemplatesParams {
  http: HttpStart;
  page: number;
  perPage: number;
  search?: string;
  defaultSearchOperator?: string;
  sortField?: string;
  sortOrder?: string;
  ruleTypeId?: string;
  tags?: string[];
}

// i really want to import this from @kbn/alerts-ui-shared but can't because of circular dependencies.
// i can't move this type to @kbn/alerting-types because the `Rule` type there uses a legacy format that is not compatible with the templates API.
// defining the type here isn't a huge deal, but it means we have to manually add any new/additional fields here to use them in the UI.
export interface RuleTemplate {
  id: string;
  name: string;
  ruleTypeId: string;
  tags: string[];
}

export interface FindRuleTemplatesResponse {
  total: number;
  page: number;
  perPage: number;
  data: RuleTemplate[];
}

export interface FindRuleTemplatesApiResponse
  extends Omit<AsApiContract<FindRuleTemplatesResponse>, 'data'> {
  data: AsApiContract<RuleTemplate>[];
}

export const rewriteTemplatesBodyRes = (
  response: FindRuleTemplatesApiResponse
): FindRuleTemplatesResponse => ({
  total: response.total,
  page: response.page,
  perPage: response.per_page,
  data: response.data.map(({ rule_type_id: ruleTypeId, ...rest }) => ({
    ruleTypeId,
    ...rest,
  })),
});

export async function findRuleTemplates({
  http,
  page,
  perPage,
  search,
  defaultSearchOperator,
  sortField,
  sortOrder,
  ruleTypeId,
  tags,
}: FindRuleTemplatesParams): Promise<FindRuleTemplatesResponse> {
  const res = await http.get<FindRuleTemplatesApiResponse>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule_template/_find`,
    {
      query: {
        page,
        per_page: perPage,
        search,
        default_search_operator: defaultSearchOperator,
        sort_field: sortField,
        sort_order: sortOrder,
        rule_type_id: ruleTypeId,
        tags,
      },
    }
  );
  return rewriteTemplatesBodyRes(res);
}
