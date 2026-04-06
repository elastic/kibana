/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { SCOUT_DEFAULT_RULE_EVALUATION_QUERY, SCOUT_DEFAULT_RULE_SCHEDULE } from './constants';

export interface CreateRuleOptions {
  name: string;
  kind?: 'alert' | 'signal';
  labels?: string[];
  owner?: string;
  /** Override default schedule (e.g. episode lifecycle tests use shorter intervals). */
  schedule?: { every: string; lookback?: string };
  /** Override default ES|QL `evaluation.query.base` (e.g. point at a test index). */
  evaluationQuery?: string;
}

function buildCreateRuleBody(opts: CreateRuleOptions) {
  const schedule = opts.schedule ?? SCOUT_DEFAULT_RULE_SCHEDULE;
  const evaluationBase = opts.evaluationQuery ?? SCOUT_DEFAULT_RULE_EVALUATION_QUERY;

  return {
    kind: opts.kind ?? 'alert',
    metadata: {
      name: opts.name,
      ...(opts.labels ? { labels: opts.labels } : {}),
      ...(opts.owner ? { owner: opts.owner } : {}),
    },
    time_field: '@timestamp',
    schedule,
    evaluation: {
      query: { base: evaluationBase },
    },
    recovery_policy: { type: 'no_breach' as const },
    grouping: { fields: ['host.name'] },
    state_transition: null,
  };
}

export async function createRule(kbnClient: KbnClient, opts: CreateRuleOptions): Promise<string> {
  const response = await kbnClient.request({
    method: 'POST',
    path: ALERTING_V2_RULE_API_PATH,
    body: buildCreateRuleBody(opts),
  });
  return (response.data as { id: string }).id;
}

export async function disableRules(kbnClient: KbnClient, ids: string[]): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: `${ALERTING_V2_RULE_API_PATH}/_bulk_disable`,
    body: { ids },
  });
}

export async function enableRules(kbnClient: KbnClient, ids: string[]): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: `${ALERTING_V2_RULE_API_PATH}/_bulk_enable`,
    body: { ids },
  });
}

export async function deleteRule(kbnClient: KbnClient, ruleId: string): Promise<void> {
  await kbnClient
    .request({
      method: 'DELETE',
      path: `${ALERTING_V2_RULE_API_PATH}/${ruleId}`,
      ignoreErrors: [404],
    })
    .catch(() => {});
}

export async function deleteRules(kbnClient: KbnClient, ruleIds: string[]): Promise<void> {
  for (const ruleId of ruleIds) {
    await deleteRule(kbnClient, ruleId);
  }
}
