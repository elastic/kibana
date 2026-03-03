/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ShorthandBinaryFilterCondition,
  RangeCondition,
  StringOrNumberOrBoolean,
  OperatorKeys,
  ShorthandUnaryFilterCondition,
  FilterCondition,
  Condition,
  BinaryOperatorKeys,
} from '../../types/conditions';
import {
  BINARY_OPERATORS,
  UNARY_OPERATORS,
  ARRAY_OPERATORS,
  isAndCondition,
  isFilterCondition,
  isOrCondition,
  isNotCondition,
  isAlwaysCondition,
  isNeverCondition,
} from '../../types/conditions';

export function getBinaryFilterOperator(
  condition: ShorthandBinaryFilterCondition
): keyof Omit<ShorthandBinaryFilterCondition, 'field'> | undefined {
  return BINARY_OPERATORS.find((op) => condition[op] !== undefined);
}

export function getBinaryFilterValue(
  condition: ShorthandBinaryFilterCondition
): StringOrNumberOrBoolean | RangeCondition | undefined {
  const operator = getBinaryFilterOperator(condition);
  return operator ? condition[operator] : undefined;
}

export function getBinaryFilterField(condition: ShorthandBinaryFilterCondition): string {
  return condition.field;
}

export function getUnaryFilterOperator(
  condition: ShorthandUnaryFilterCondition
): keyof Omit<ShorthandUnaryFilterCondition, 'field'> | undefined {
  return UNARY_OPERATORS.find((op) => condition[op] !== undefined);
}

export function getUnaryFilterValue(condition: ShorthandUnaryFilterCondition): unknown {
  const operator = getUnaryFilterOperator(condition);
  return operator ? condition[operator] : undefined;
}

export function getUnaryFilterField(condition: ShorthandUnaryFilterCondition): string {
  return condition.field;
}

export function getFilterValue(
  condition: FilterCondition
): StringOrNumberOrBoolean | RangeCondition | undefined {
  const binaryOp = getBinaryFilterOperator(condition as ShorthandBinaryFilterCondition);
  if (binaryOp) {
    return (condition as ShorthandBinaryFilterCondition)[binaryOp];
  }
  const unaryOp = getUnaryFilterOperator(condition as ShorthandUnaryFilterCondition);
  if (unaryOp) {
    return (condition as ShorthandUnaryFilterCondition)[unaryOp];
  }
  return undefined;
}

export function getFilterOperator(condition: FilterCondition): OperatorKeys | undefined {
  const binaryOp = getBinaryFilterOperator(condition as ShorthandBinaryFilterCondition);
  if (binaryOp) {
    return binaryOp;
  }
  const unaryOp = getUnaryFilterOperator(condition as ShorthandUnaryFilterCondition);
  if (unaryOp) {
    return unaryOp;
  }
  return undefined;
}

export function getDefaultFormValueForOperator(
  operator: OperatorKeys
): string | number | boolean | object {
  switch (operator) {
    case 'eq':
    case 'neq':
    case 'contains':
    case 'startsWith':
    case 'endsWith':
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte':
      return '';
    case 'exists':
      return true;
    case 'range':
      return {};
    case 'includes':
      return '';
    default:
      return '';
  }
}

export function isFilterConditionObject(condition: Condition): condition is FilterCondition {
  const allOperators = [...BINARY_OPERATORS, ...UNARY_OPERATORS];
  return allOperators.some((op) => op in condition);
}

export function getConditionFields(
  condition: Condition
): Array<{ name: string; type: 'boolean' | 'number' | 'string' }> {
  const fields = collectFields(condition);
  // deduplicate fields, if already mapped, prefer boolean over number, and number over string
  const uniqueFields = new Map<string, 'boolean' | 'number' | 'string'>();

  const typePrecedenceAscOrder = ['string', 'number', 'boolean'] as const;
  fields.forEach(({ name, type }) => {
    const existing = uniqueFields.get(name);
    if (
      !existing ||
      typePrecedenceAscOrder.indexOf(type) > typePrecedenceAscOrder.indexOf(existing)
    ) {
      uniqueFields.set(name, type);
    }
  });

  return Array.from(uniqueFields).map(([name, type]) => ({ name, type }));
}

function collectFields(
  condition: Condition
): Array<{ name: string; type: 'boolean' | 'number' | 'string' }> {
  if (isFilterCondition(condition)) {
    return [{ name: condition.field, type: getFieldTypeForFilterCondition(condition) }];
  }
  if (isAndCondition(condition)) {
    return condition.and.flatMap(collectFields);
  }
  if (isOrCondition(condition)) {
    return condition.or.flatMap(collectFields);
  }
  if (isNotCondition(condition)) {
    return collectFields(condition.not);
  }

  return [];
}

function getFieldTypeForFilterCondition(
  condition: FilterCondition
): 'boolean' | 'number' | 'string' {
  const operator = getFilterOperator(condition);
  const value = getFilterValue(condition);

  switch (operator) {
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return 'number';
    case 'neq':
    case 'eq':
      // Return number or boolean if the value is of that type, otherwise string
      if (typeof value === 'number') {
        return 'number';
      }
      if (typeof value === 'boolean') {
        return 'boolean';
      }
      return 'string';

    case 'exists':
    case 'contains':
    case 'startsWith':
    case 'endsWith':
    case 'includes':
      return 'string';
    default:
      return 'string';
  }
}

/**
 * Checks if a condition is complete and ready to be used.
 * A condition is complete if:
 * - It's undefined (optional conditions)
 * - It has a non-empty field
 * - Its value is complete based on operator type:
 *   - Range: both lower and upper bounds are filled
 *   - Boolean (exists): any boolean is valid
 *   - String/Number: value is not empty
 */
export function isConditionComplete(condition: Condition | undefined): boolean {
  // undefined means no condition specified, which is valid (optional condition)
  if (condition === undefined) {
    return true;
  }

  if (isAlwaysCondition(condition)) {
    return true;
  }
  if (isNeverCondition(condition)) {
    return true;
  }

  // Handle logical conditions (and, or, not) by checking all nested conditions
  if (isAndCondition(condition)) {
    return condition.and.every(isConditionComplete);
  }
  if (isOrCondition(condition)) {
    return condition.or.every(isConditionComplete);
  }
  if (isNotCondition(condition)) {
    return isConditionComplete(condition.not);
  }

  // Handle filter conditions
  if (isFilterCondition(condition)) {
    // Field must be non-empty
    if (!condition.field || condition.field.trim() === '') {
      return false;
    }

    const operator = getFilterOperator(condition);
    const value = getFilterValue(condition);

    // For range conditions, check that both boundaries are filled
    if (operator === 'range' && typeof value === 'object' && value !== null) {
      const rangeValue = value as RangeCondition;
      const hasFrom =
        (rangeValue.gte !== undefined && rangeValue.gte !== '') ||
        (rangeValue.gt !== undefined && rangeValue.gt !== '');
      const hasTo =
        (rangeValue.lte !== undefined && rangeValue.lte !== '') ||
        (rangeValue.lt !== undefined && rangeValue.lt !== '');
      return hasFrom && hasTo;
    }

    // For boolean values (exists operator), any boolean is valid
    if (typeof value === 'boolean') {
      return true;
    }

    // For number values, any number is valid (including 0)
    if (typeof value === 'number') {
      return true;
    }

    // For string values, must be non-empty
    if (typeof value === 'string') {
      return value.trim() !== '';
    }

    // If we reach here, the value is missing or invalid type
    return false;
  }

  return false;
}

export const isArrayOperator = (operator: OperatorKeys | undefined): boolean => {
  return operator !== undefined && ARRAY_OPERATORS.includes(operator as BinaryOperatorKeys);
};
