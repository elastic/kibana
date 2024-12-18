/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingUsage } from '../types';

export function groupRulesBySearchType(
  rulesBySearchType: Record<string, number>
): AlertingUsage['count_by_type'] {
  return {
    '__es-query_es_query': rulesBySearchType.esQuery ?? 0,
    '__es-query_search_source': rulesBySearchType.searchSource ?? 0,
    '__es-query_esql_query': rulesBySearchType.esqlQuery ?? 0,
  };
}
