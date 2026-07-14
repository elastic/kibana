/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';

/**
 * The matcher string the simple-action flow writes when linking a policy to a single rule
 */
export const buildRuleScopedMatcher = (ruleId: string): string => `rule.id: "${ruleId}"`;

export interface RuleScopedSimpleActionPolicy {
  policyId: string;
  policyVersion?: string;
  workflowId: string;
}

/**
 * Narrows a list of action policies to the rule-scoped, single-workflow policies
 * that the simple-action flow manages for the given rule. Deduplicates by policy id.
 */
export const selectRuleSimpleActionPolicies = (
  policies: ActionPolicyResponse[],
  ruleId: string
): RuleScopedSimpleActionPolicy[] => {
  const matcher = buildRuleScopedMatcher(ruleId);
  const seenPolicyIds = new Set<string>();

  return policies
    .filter(
      (policy) =>
        policy.matcher === matcher &&
        policy.destinations.length === 1 &&
        policy.destinations[0].type === 'workflow'
    )
    .filter((policy) => {
      if (seenPolicyIds.has(policy.id)) {
        return false;
      }
      seenPolicyIds.add(policy.id);
      return true;
    })
    .map((policy) => ({
      policyId: policy.id,
      policyVersion: policy.version,
      workflowId: policy.destinations[0].id,
    }));
};
