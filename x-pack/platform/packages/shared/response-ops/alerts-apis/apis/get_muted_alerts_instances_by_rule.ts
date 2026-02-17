/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { nodeBuilder } from '@kbn/es-query';

const INTERNAL_FIND_RULES_URL = '/internal/alerting/rules/_find';

export interface Rule {
  id: string;
  muted_alert_ids: string[];
}

export interface FindRulesResponse {
  data: Rule[];
}

export interface GetMutedAlertsInstancesByRuleParams {
  ruleIds: string[];
  http: HttpStart;
  signal?: AbortSignal;
}

export const getMutedAlertsInstancesByRule = async ({
  http,
  ruleIds,
  signal,
}: GetMutedAlertsInstancesByRuleParams) => {
  const filterNode = nodeBuilder.or(ruleIds.map((id) => nodeBuilder.is('alert.id', `alert:${id}`)));
  return http.post<FindRulesResponse>(INTERNAL_FIND_RULES_URL, {
    body: JSON.stringify({
      filter: JSON.stringify(filterNode),
      fields: ['id', 'mutedInstanceIds'],
      page: 1,
      per_page: ruleIds.length,
    }),
    signal,
  });
};
