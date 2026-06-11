/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { computeRuleOnRuleId } from './compute_rule_on_rule_id';
import { TAG_MONITORED_PREFIX } from './constants';

export interface DeprovisionRuleOnRulesResult {
  deletedRuleIds: string[];
  notFoundRuleIds: string[];
}

/**
 * Deletes all rule-on-rule children for a monitored base rule.
 * When `knownChildRuleIds` is omitted, deletes the count-based id and attempts
 * tag-based discovery via rules listing.
 */
export async function deprovisionRuleOnRules({
  monitoredRuleId,
  rulesClient,
  knownChildRuleIds,
}: {
  monitoredRuleId: string;
  rulesClient: RulesClientApi;
  knownChildRuleIds?: string[];
}): Promise<DeprovisionRuleOnRulesResult> {
  const candidateIds = new Set<string>(knownChildRuleIds ?? [computeRuleOnRuleId(monitoredRuleId)]);

  const monitoredTag = `${TAG_MONITORED_PREFIX}${monitoredRuleId}`;
  const { items: taggedRules } = await rulesClient.findRules({
    filter: `metadata.tags: "${monitoredTag}"`,
    perPage: 100,
  });

  for (const rule of taggedRules) {
    candidateIds.add(rule.id);
  }

  const ids = [...candidateIds];
  if (ids.length === 0) {
    return { deletedRuleIds: [], notFoundRuleIds: [] };
  }

  const { errors } = await rulesClient.bulkDeleteRules({ ids });
  const notFoundRuleIds = errors
    .filter((entry) => entry.error.statusCode === 404)
    .map((entry) => entry.id);
  const deletedRuleIds = ids.filter((id) => !notFoundRuleIds.includes(id));

  return { deletedRuleIds, notFoundRuleIds };
}
