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
} from '../../types/conditions';
import {
  BINARY_OPERATORS,
  UNARY_OPERATORS,
  isAndCondition,
  isFilterCondition,
  isOrCondition,
  isNotCondition,
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
      return { gte: 0, lt: 0 };
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
      return 'string';
    default:
      return 'string';
  }
}
