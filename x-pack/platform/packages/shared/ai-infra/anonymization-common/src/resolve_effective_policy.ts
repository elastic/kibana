/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldRule, EffectiveFieldPolicy, EffectivePolicy } from './types';

/**
 * Resolves the effective anonymization policy from one or more sets of field rules.
 *
 * When multiple profiles contribute rules for the same field, conflicts are
 * resolved using "most restrictive wins":
 *
 * - **Deny** (`allowed=false`) wins over everything
 * - **Anonymize** (`allowed=true`, `anonymized=true`) wins over Allow
 * - **Allow** (`allowed=true`, `anonymized=false`)
 *
 * This is a pure function that can be used by both the anonymization plugin's
 * service layer and unit tests.
 *
 * @param fieldRuleSets - One or more arrays of field rules (from contributing profiles)
 * @returns The effective policy keyed by field name
 */
export const resolveEffectivePolicy = (
  ...fieldRuleSets: FieldRule[][]
): EffectivePolicy => {
  const result: EffectivePolicy = {};

  for (const fieldRules of fieldRuleSets) {
    for (const rule of fieldRules) {
      const existing = result[rule.field];

      if (existing === undefined) {
        // First time seeing this field — set directly
        result[rule.field] = fieldRuleToEffective(rule);
      } else {
        // Merge: most restrictive wins
        result[rule.field] = mergeFieldPolicies(existing, fieldRuleToEffective(rule));
      }
    }
  }

  return result;
};

/**
 * Converts a single field rule to its effective policy.
 */
const fieldRuleToEffective = (rule: FieldRule): EffectiveFieldPolicy => {
  if (!rule.allowed) {
    return { action: 'deny' };
  }

  if (rule.anonymized && rule.entityClass) {
    return { action: 'anonymize', entityClass: rule.entityClass };
  }

  return { action: 'allow' };
};

/**
 * Merges two effective field policies, choosing the most restrictive.
 *
 * Priority: deny > anonymize > allow
 */
const mergeFieldPolicies = (
  a: EffectiveFieldPolicy,
  b: EffectiveFieldPolicy
): EffectiveFieldPolicy => {
  // Deny wins over everything
  if (a.action === 'deny' || b.action === 'deny') {
    return { action: 'deny' };
  }

  // Anonymize wins over allow
  if (a.action === 'anonymize') {
    return a;
  }
  if (b.action === 'anonymize') {
    return b;
  }

  // Both are allow
  return { action: 'allow' };
};
