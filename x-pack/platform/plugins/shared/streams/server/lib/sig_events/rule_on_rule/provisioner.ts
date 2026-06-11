/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import {
  RULE_ON_RULE_NAME_PREFIX,
  RULE_ON_RULE_SCHEDULE_EVERY,
  RULE_ON_RULE_SCHEDULE_LOOKBACK,
} from './constants';
import { computeRuleOnRuleId } from './compute_rule_on_rule_id';
import { shouldProvisionBaseRule } from './filters';
import { buildRuleOnRuleTags, extractStreamNameFromTags } from './tags';
import type { BaseRuleSnapshot, RuleOnRulePlan } from './types';
import { validateRuleOnRulePlan } from './validate_rule_on_rule_esql';

export interface ProvisionRuleOnRulesResult {
  provisionedRuleIds: string[];
  skipped: boolean;
  reason?: string;
}

export async function provisionRuleOnRules({
  baseRule,
  plan,
  rulesClient,
  esClient,
}: {
  baseRule: BaseRuleSnapshot;
  plan: RuleOnRulePlan;
  rulesClient: RulesClientApi;
  esClient: IScopedClusterClient;
}): Promise<ProvisionRuleOnRulesResult> {
  if (!shouldProvisionBaseRule(baseRule)) {
    return { provisionedRuleIds: [], skipped: true, reason: 'Base rule is not eligible' };
  }

  await validateRuleOnRulePlan(plan, esClient);

  const streamName = extractStreamNameFromTags(baseRule.tags);
  const tags = buildRuleOnRuleTags({
    streamName,
    monitoredRuleId: baseRule.ruleId,
  });

  const provisionedRuleIds: string[] = [];

  for (const entry of plan.rules) {
    const childRuleId = computeRuleOnRuleId(baseRule.ruleId, entry.metricName);
    const ruleName = entry.metricName
      ? `${RULE_ON_RULE_NAME_PREFIX}: ${baseRule.name} (${entry.metricName})`
      : `${RULE_ON_RULE_NAME_PREFIX}: ${baseRule.name}`;

    await rulesClient
      .upsertRule({
        id: childRuleId,
        data: {
          kind: 'signal',
          metadata: {
            name: ruleName,
            tags,
            description: `System-managed change detection for rule ${baseRule.ruleId}`,
          },
          time_field: '@timestamp',
          schedule: {
            every: RULE_ON_RULE_SCHEDULE_EVERY,
            lookback: RULE_ON_RULE_SCHEDULE_LOOKBACK,
          },
          evaluation: {
            query: { base: entry.esql },
          },
        },
      })
      .catch(async (error) => {
        if (isBoom(error) && error.output.statusCode === 409) {
          await rulesClient.updateRule({
            id: childRuleId,
            data: {
              metadata: { name: ruleName, tags },
              schedule: {
                every: RULE_ON_RULE_SCHEDULE_EVERY,
                lookback: RULE_ON_RULE_SCHEDULE_LOOKBACK,
              },
              evaluation: { query: { base: entry.esql } },
            },
          });
          return;
        }
        throw error;
      });

    provisionedRuleIds.push(childRuleId);
  }

  return { provisionedRuleIds, skipped: false };
}
