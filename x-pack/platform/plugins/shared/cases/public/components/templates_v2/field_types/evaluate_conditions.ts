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
import { FieldType } from '../../../../common/types/domain/template/fields';

const parseCheckboxValue = (value: unknown): string[] => {
  if (typeof value !== 'string' || value === '') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

const evaluateCheckboxRule = (arr: string[], rule: ConditionRule): boolean | null => {
  switch (rule.operator) {
    case 'contains':
      return arr.includes(String(rule.value ?? ''));
    case 'empty':
      return arr.length === 0;
    case 'not_empty':
      return arr.length > 0;
    default:
      return null;
  }
};

const evaluateScalarRule = (current: unknown, rule: ConditionRule): boolean => {
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

const evaluateRule = (
  rule: ConditionRule,
  fieldValues: Record<string, unknown>,
  fieldTypeMap: Record<string, string>,
  fieldControlMap: Record<string, string>
): boolean => {
  // Unknown field reference → safe default: don't hide by surprise
  if (fieldTypeMap[rule.field] === undefined) return true;

  const current = fieldValues[rule.field];

  if (fieldControlMap[rule.field] === FieldType.CHECKBOX_GROUP) {
    const result = evaluateCheckboxRule(parseCheckboxValue(current), rule);
    if (result !== null) return result;
  }

  return evaluateScalarRule(current, rule);
};

/**
 * Evaluates a condition (simple rule or compound AND/OR) against a map of field values.
 *
 * @param condition - The condition to evaluate (ConditionRule or CompoundCondition)
 * @param fieldValues - Map of fieldName -> current value
 * @param fieldTypeMap - Map of fieldName -> type; unknown fields default to true
 * @param fieldControlMap - Map of fieldName -> control (e.g. CHECKBOX_GROUP)
 */
export const evaluateCondition = (
  condition: ConditionRule | CompoundCondition,
  fieldValues: Record<string, unknown>,
  fieldTypeMap: Record<string, string>,
  fieldControlMap: Record<string, string> = {}
): boolean => {
  if ('rules' in condition) {
    const { combine, rules } = condition;
    return combine === 'any'
      ? rules.some((rule) => evaluateRule(rule, fieldValues, fieldTypeMap, fieldControlMap))
      : rules.every((rule) => evaluateRule(rule, fieldValues, fieldTypeMap, fieldControlMap));
  }

  return evaluateRule(condition, fieldValues, fieldTypeMap, fieldControlMap);
};
