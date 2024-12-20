/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { AsApiContract } from '@kbn/actions-plugin/common';
import { KueryNode } from '@kbn/es-query';
import type { Rule, Pagination, Sorting, RuleStatus } from '../../../types';
import { transformRule } from './common_transformations';

export interface LoadRulesProps {
  http: HttpSetup;
  page: Pagination;
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
  tagsFilter?: string[];
  ruleExecutionStatusesFilter?: string[];
  ruleLastRunOutcomesFilter?: string[];
  ruleParamsFilter?: Record<string, string | number | object>;
  ruleStatusesFilter?: RuleStatus[];
  sort?: Sorting;
  kueryNode?: KueryNode;
  ruleTypeIds?: string[];
  consumers?: string[];
  hasReference?: {
    type: string;
    id: string;
  };
}

export const rewriteRulesResponseRes = (results: Array<AsApiContract<Rule>>): Rule[] => {
  return results.map((item) => transformRule(item));
};
