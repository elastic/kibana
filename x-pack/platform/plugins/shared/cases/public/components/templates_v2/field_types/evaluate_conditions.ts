/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConditionRule,
  CompoundCondition,
} from '../../../../common/types/domain/template/fields';

const evaluateRule = (
  rule: ConditionRule,
  fieldValues: Record<string, unknown>,
  fieldTypeMap: Record<string, string>
): boolean => {
  // Unknown field reference → safe default: don't hide by surprise
  if (fieldTypeMap[rule.field] === undefined) return true;

  const current = fieldValues[rule.field];

  switch (rule.operator) {
    case 'eq':
      return String(current ?? '') === String(rule.value ?? '');
    case 'neq':
      return String(current ?? '') !== String(rule.value ?? '');
    case 'contains':
      return typeof current === 'string' && current.includes(String(rule.value ?? ''));
    case 'empty':
      return current === null || current === undefined || current === '';
    case 'not_empty':
      return current !== null && current !== undefined && current !== '';
    default:
      return true;
  }
};

/**
 * Evaluates a condition (simple rule or compound AND/OR) against a map of field values.
 *
 * @param condition - The condition to evaluate (ConditionRule or CompoundCondition)
 * @param fieldValues - Map of fieldName -> current value
 * @param fieldTypeMap - Map of fieldName -> type; unknown fields default to true
 */
export const evaluateCondition = (
  condition: ConditionRule | CompoundCondition,
  fieldValues: Record<string, unknown>,
  fieldTypeMap: Record<string, string>
): boolean => {
  if ('rules' in condition) {
    const { combine, rules } = condition;
    return combine === 'any'
      ? rules.some((rule) => evaluateRule(rule, fieldValues, fieldTypeMap))
      : rules.every((rule) => evaluateRule(rule, fieldValues, fieldTypeMap));
  }

  return evaluateRule(condition, fieldValues, fieldTypeMap);
};
