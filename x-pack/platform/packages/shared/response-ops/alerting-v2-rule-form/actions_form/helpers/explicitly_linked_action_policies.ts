/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { fromKueryExpression, type KueryNode } from '@kbn/es-query';

const RULE_ID_FIELD = 'rule.id';

const getIsFieldAndValue = (node: KueryNode): { field: string; value: string } | null => {
  if (node.type !== 'function' || node.function !== 'is') {
    return null;
  }

  const args = node.arguments as KueryNode[];
  if (args.length < 2) {
    return null;
  }

  const fieldArg = args[0];
  const valueArg = args[1];
  if (fieldArg?.type !== 'literal' || typeof fieldArg.value !== 'string') {
    return null;
  }
  if (valueArg?.type !== 'literal' || typeof valueArg.value !== 'string') {
    return null;
  }

  return {
    field: fieldArg.value,
    value: valueArg.value,
  };
};

const isRuleIdEqualsNode = (node: KueryNode, ruleId: string): boolean => {
  const parsed = getIsFieldAndValue(node);
  return parsed?.field === RULE_ID_FIELD && parsed.value === ruleId;
};

const containsPositiveRuleIdMatch = (
  node: KueryNode,
  ruleId: string,
  negated: boolean
): boolean => {
  if (node.type !== 'function') {
    return false;
  }

  switch (node.function) {
    case 'is':
      return !negated && isRuleIdEqualsNode(node, ruleId);
    case 'and':
    case 'or':
      return (node.arguments as KueryNode[]).some((arg) =>
        containsPositiveRuleIdMatch(arg, ruleId, negated)
      );
    case 'not':
      return containsPositiveRuleIdMatch(node.arguments[0], ruleId, !negated);
    case 'nested':
      return containsPositiveRuleIdMatch(node.arguments[1], ruleId, negated);
    default:
      return false;
  }
};

const unwrapSingleAndChain = (node: KueryNode): KueryNode => {
  if (node.type !== 'function' || node.function !== 'and') {
    return node;
  }

  const args = node.arguments as KueryNode[];
  if (args.length !== 1) {
    return node;
  }

  return unwrapSingleAndChain(args[0]);
};

const parseMatcherAst = (matcher: string): KueryNode | null => {
  const trimmed = matcher.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return fromKueryExpression(trimmed);
  } catch {
    return null;
  }
};

/**
 * Returns true when the matcher contains a positive `rule.id` clause equal to `ruleId`.
 */
export const isExplicitlyLinkedToRule = (
  matcher: string | null | undefined,
  ruleId: string
): boolean => {
  if (!matcher?.trim() || !ruleId) {
    return false;
  }

  const ast = parseMatcherAst(matcher);
  if (!ast) {
    return false;
  }

  return containsPositiveRuleIdMatch(ast, ruleId, false);
};

/**
 * True when the matcher is explicitly linked to the rule and contains no filters beyond `rule.id`.
 */
export const isRuleScopedCatchAllMatcher = (
  matcher: string | null | undefined,
  ruleId: string
): boolean => {
  if (!isExplicitlyLinkedToRule(matcher, ruleId) || !matcher?.trim()) {
    return false;
  }

  const ast = parseMatcherAst(matcher);
  if (!ast) {
    return false;
  }

  return isRuleIdEqualsNode(unwrapSingleAndChain(ast), ruleId);
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
