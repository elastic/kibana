/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse, PolicyMatcher } from '@kbn/alerting-v2-schemas';

const hasOnlyRuleId = (matcher: PolicyMatcher, ruleId: string): boolean => {
  const { tags, rules, statuses, expression } = matcher;
  const hasOtherCriteria =
    (tags != null && tags.length > 0) ||
    (statuses != null && statuses.length > 0) ||
    (expression != null && expression.trim() !== '');
  const hasExactlyOneRule = rules != null && rules.length === 1 && rules[0] === ruleId;
  return hasExactlyOneRule && !hasOtherCriteria;
};

/**
 * Returns true when the matcher contains a positive `rule.id` match for `ruleId`.
 */
export const isExplicitlyLinkedToRule = (
  matcher: PolicyMatcher | null | undefined,
  ruleId: string
): boolean => {
  if (!matcher || !ruleId) {
    return false;
  }
  return (matcher.rules ?? []).includes(ruleId);
};

/**
 * True when the matcher is explicitly linked to the rule and contains no filters beyond `rule.id`.
 */
export const isRuleScopedCatchAllMatcher = (
  matcher: PolicyMatcher | null | undefined,
  ruleId: string
): boolean => {
  if (!matcher || !ruleId) {
    return false;
  }
  return hasOnlyRuleId(matcher, ruleId);
};

export interface LinkedActionPolicySummary {
  policies: ActionPolicyResponse[];
  totalCount: number;
  catchAllCount: number;
  matchingCriteriaCount: number;
}

/**
 * Filters policies explicitly linked to `ruleId` and computes stat breakdowns for the rule details UI.
 */
export const summarizeExplicitlyLinkedActionPolicies = (
  policies: ActionPolicyResponse[],
  ruleId: string
): LinkedActionPolicySummary => {
  const linked = policies
    .filter((policy) => isExplicitlyLinkedToRule(policy.matcher, ruleId))
    .sort((left, right) => left.name.localeCompare(right.name));

  let catchAllCount = 0;
  let matchingCriteriaCount = 0;

  for (const policy of linked) {
    if (isRuleScopedCatchAllMatcher(policy.matcher, ruleId)) {
      catchAllCount++;
    } else {
      matchingCriteriaCount++;
    }
  }

  return {
    policies: linked,
    totalCount: linked.length,
    catchAllCount,
    matchingCriteriaCount,
  };
};
