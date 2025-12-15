/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlwaysCondition,
  Condition,
  FilterCondition,
  OperatorKeys,
  ShorthandBinaryFilterCondition,
} from '@kbn/streamlang';
import {
  ALWAYS_CONDITION,
  getFilterOperator,
  getFilterValue,
  isAlwaysCondition,
  isCondition,
  isFilterConditionObject,
} from '@kbn/streamlang';

import { cloneDeep, isEqual, isPlainObject } from 'lodash';

export const EMPTY_EQUALS_CONDITION: ShorthandBinaryFilterCondition = Object.freeze({
  field: '',
  eq: '',
});

export function alwaysToEmptyEquals<T extends Condition>(condition: T): Exclude<T, AlwaysCondition>;

export function alwaysToEmptyEquals(condition: Condition) {
  if (isAlwaysCondition(condition)) {
    return cloneDeep(EMPTY_EQUALS_CONDITION);
  }
  return condition;
}

export function emptyEqualsToAlways(condition: Condition) {
  if (isEqual(condition, EMPTY_EQUALS_CONDITION)) {
    return ALWAYS_CONDITION;
  }
  return condition;
}

export function undefinedToAlways(condition: Condition | undefined) {
  if (!condition) {
    return ALWAYS_CONDITION;
  }
  return condition;
}

const UI_SUPPORTED_OPERATORS_AND_VALUE_TYPES: Record<OperatorKeys, string[]> = {
  // Allow both string and boolean for eq/neq so that boolean shorthand (e.g. "equals true") can rendered in UI
  eq: ['string', 'boolean'],
  neq: ['string', 'boolean'],

  gt: ['string'],
  gte: ['string'],
  lt: ['string'],
  lte: ['string'],
  contains: ['string'],
  startsWith: ['string'],
  endsWith: ['string'],
  exists: ['boolean'],

  range: ['object'],
};

function isOperatorUiSupported(
  operator: OperatorKeys
): operator is keyof typeof UI_SUPPORTED_OPERATORS_AND_VALUE_TYPES {
  return operator in UI_SUPPORTED_OPERATORS_AND_VALUE_TYPES;
}

export const isConditionEditableInUi = (
  condition: Condition
): condition is FilterCondition | AlwaysCondition => {
  if (isPlainObject(condition) && isFilterConditionObject(condition)) {
    const operator = getFilterOperator(condition as FilterCondition);
    const value = getFilterValue(condition as FilterCondition);

    // Check if the operator itself is supported by the UI
    if (!operator || !isOperatorUiSupported(operator)) {
      return false;
    }

    // Check if the value's data type is supported for that specific operator
    const allowedTypes = UI_SUPPORTED_OPERATORS_AND_VALUE_TYPES[operator];
    if (!allowedTypes) {
      return false;
    }

    return allowedTypes.includes(typeof value);
  }

  // If it's not a simple filter, the only other UI-representable state is
  // an 'always' condition, which is representable in UI (empty condition)
  return isAlwaysCondition(condition);
};

// Determines whether a filter condition can be represented using the boolean shorthand
// e.g. { field: 'foo', eq: true } can be represented by "equals true" operator in the UI
export function isShorthandBooleanFilterCondition(
  condition: FilterCondition
): condition is ShorthandBinaryFilterCondition {
  return (
    (isPlainObject(condition) &&
      isFilterConditionObject(condition) &&
      'eq' in condition &&
      typeof condition.eq === 'boolean') ||
    ('neq' in condition && typeof condition.neq === 'boolean')
  );
}

// Determines whether a value input should be displayed for a condition.
// Shorthand binary operators e.g. "equals true" do not need a value field.
export function conditionNeedsValueField(condition: FilterCondition): boolean {
  return !isShorthandBooleanFilterCondition(condition);
}

/**
 * Get the field name from a filter condition.
 * @param condition condition to extract field name from
 * @returns field name or undefined if not a filter condition
 */
export const getFilterConditionField = (condition: Condition) => {
  return isCondition(condition) && alwaysToEmptyEquals(condition)
    ? isPlainObject(condition) && isFilterConditionObject(condition)
      ? condition.field
      : undefined
    : undefined;
};

/**
 * Validates that a condition is complete and ready to be saved.
 * Checks for valid structure, non-empty field, and non-empty values.
 * @param value condition to validate
 * @returns true if the condition is complete and valid
 */
export const isFilterConditionComplete = (value: Condition | unknown): boolean => {
  // First check: validate structure with existing isCondition check
  if (!isCondition(value)) {
    return false;
  }

  // Additional check: ensure filter conditions have complete values
  if (isPlainObject(value) && isFilterConditionObject(value)) {
    const filterCondition = value as FilterCondition;

    // Field must be non-empty
    if (!filterCondition.field || filterCondition.field.trim() === '') {
      return false;
    }

    const operator = getFilterOperator(filterCondition);
    const conditionValue = getFilterValue(filterCondition);

    // For range conditions, check that both boundaries are filled
    if (operator === 'range' && typeof conditionValue === 'object' && conditionValue !== null) {
      const hasFrom =
        (conditionValue.gte !== undefined && conditionValue.gte !== '') ||
        (conditionValue.gt !== undefined && conditionValue.gt !== '');
      const hasTo =
        (conditionValue.lte !== undefined && conditionValue.lte !== '') ||
        (conditionValue.lt !== undefined && conditionValue.lt !== '');
      return hasFrom && hasTo;
    }

    // For boolean values, any boolean is valid (exists operator or eq/neq shorthand)
    if (typeof conditionValue === 'boolean') {
      return true;
    }

    // For string values, must be non-empty
    if (typeof conditionValue === 'string') {
      return conditionValue.trim() !== '';
    }

    // If we reach here, the value is missing or invalid
    return false;
  }

  // For other valid conditions (e.g., 'always'), pass through
  return true;
};
