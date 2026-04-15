/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationEntityClass, FieldRule } from '@kbn/anonymization-common';
import {
  FIELD_RULE_ACTION_ALLOW,
  FIELD_RULE_ACTION_ANONYMIZE,
  FIELD_RULE_ACTION_DENY,
  type FieldRuleAction,
} from './field_rule_actions';

const DEFAULT_ENTITY_CLASS = 'MISC';
const ECS_FIELD_PREFIXES = ['@timestamp', 'event.', 'host.', 'user.', 'source.', 'destination.'];
const DEFAULT_PRIORITY_TOKENS = [
  '@timestamp',
  'email',
  'name',
  'address',
  'phone',
  'birth',
  'dob',
  'ssn',
  'passport',
  'card',
  'token',
  'secret',
  'password',
] as const;
const PREFIX_MATCH_SCORE = 100;
const CONTAINS_MATCH_SCORE = 60;
const ECS_BOOST_SCORE = 25;
const DEFAULT_PRIORITY_BOOST_MAX = 40;

interface FieldRuleActionOptions {
  entityClass?: AnonymizationEntityClass;
}

const toRuleByAction = (
  rule: FieldRule,
  action: FieldRuleAction,
  options?: FieldRuleActionOptions
): FieldRule => {
  if (action === FIELD_RULE_ACTION_DENY) {
    return {
      ...rule,
      allowed: false,
      anonymized: false,
      entityClass: undefined,
    };
  }

  if (action === FIELD_RULE_ACTION_ALLOW) {
    return {
      ...rule,
      allowed: true,
      anonymized: false,
      entityClass: undefined,
    };
  }

  if (action === FIELD_RULE_ACTION_ANONYMIZE) {
    return {
      ...rule,
      allowed: true,
      anonymized: true,
      entityClass: options?.entityClass ?? rule.entityClass ?? DEFAULT_ENTITY_CLASS,
    };
  }

  return rule;
};

export const applyFieldAction = (
  rules: FieldRule[],
  field: string,
  action: FieldRuleAction,
  options?: FieldRuleActionOptions
): FieldRule[] =>
  rules.map((rule) => (rule.field === field ? toRuleByAction(rule, action, options) : rule));

export const applyBulkFieldAction = (
  rules: FieldRule[],
  selectedFields: string[],
  action: FieldRuleAction,
  options?: FieldRuleActionOptions
): FieldRule[] => {
  const selected = new Set(selectedFields);
  return rules.map((rule) =>
    selected.has(rule.field) ? toRuleByAction(rule, action, options) : rule
  );
};

export const rankFieldRules = (
  rules: FieldRule[],
  {
    query,
    ecsBoost = true,
    recentFields = [],
  }: {
    query: string;
    ecsBoost?: boolean;
    recentFields?: string[];
  }
): FieldRule[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const recentBoost = new Map(
    recentFields.map((field, index) => [field, recentFields.length - index])
  );

  const scoreFor = (field: string): number => {
    const normalizedField = field.toLowerCase();
    const hasEcsPrefix = ECS_FIELD_PREFIXES.some((prefix) => normalizedField.startsWith(prefix));
    let score = 0;

    if (normalizedQuery) {
      if (normalizedField.startsWith(normalizedQuery)) {
        score += PREFIX_MATCH_SCORE;
      } else if (normalizedField.includes(normalizedQuery)) {
        score += CONTAINS_MATCH_SCORE;
      }
    } else {
      if (!hasEcsPrefix) {
        const defaultPriorityTokenIndex = DEFAULT_PRIORITY_TOKENS.findIndex((token) =>
          normalizedField.includes(token)
        );
        if (defaultPriorityTokenIndex >= 0) {
          score += Math.max(1, DEFAULT_PRIORITY_BOOST_MAX - defaultPriorityTokenIndex);
        }
      }
    }

    if (ecsBoost && hasEcsPrefix) {
      score += ECS_BOOST_SCORE;
    }

    score += recentBoost.get(field) ?? 0;
    return score;
  };

  return [...rules].sort((left, right) => {
    const scoreDiff = scoreFor(right.field) - scoreFor(left.field);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return left.field.localeCompare(right.field);
  });
};
