/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { FindRulesResponse } from '@kbn/alerting-v2-plugin/public/services/rules_api';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';

const SEARCH_PAGE_SIZE = 50;

export interface FetchRulesSearchParams {
  http: HttpStart;
  query: string;
}

/**
 * Search rules by name via the internal rules API.
 * Used by the rule filter dropdown to find rules beyond those already loaded for the table.
 */
export async function fetchRulesSearch({
  http,
  query,
}: FetchRulesSearchParams): Promise<Array<{ label: string; value: string }>> {
  if (!query || !query.trim()) {
    return [];
  }
  const res = await http.get<FindRulesResponse>(ALERTING_V2_RULE_API_PATH, {
    query: {
      search: query.trim(),
      perPage: SEARCH_PAGE_SIZE,
      page: 1,
    },
  });
  return res.items.map((rule) => ({
    label: rule.metadata?.name ?? rule.id,
    value: rule.id,
  }));
}
