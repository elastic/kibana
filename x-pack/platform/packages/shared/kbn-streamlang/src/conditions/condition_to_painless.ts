/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolean, isString } from 'lodash';
import type {
  Condition,
  FilterCondition,
  RangeCondition,
  ShorthandBinaryFilterCondition,
  ShorthandUnaryFilterCondition,
} from '../../types/conditions';
import { BINARY_OPERATORS } from '../../types/conditions';

// Utility: get the field name from a filter condition
function safePainlessField(conditionOrField: FilterCondition | string) {
  if (typeof conditionOrField === 'string') {
    return `$('${conditionOrField}', null)`;
  }
  return `$('${conditionOrField.field}', null)`;
}

function encodeValue(value: string | number | boolean) {
  if (isString(value)) {
    return `"${value}"`;
  }
  if (isBoolean(value)) {
    return value ? 'true' : 'false';
  }
  return value;
}

function generateRangeComparisonClauses(
  field: string,
  operator: 'gt' | 'gte' | 'lt' | 'lte',
  value: number
): { numberClause: string; stringClause: string } {
  const opMap: Record<typeof operator, string> = {
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
  };
  const opSymbol = opMap[operator];
  return {
    numberClause: `${field} ${opSymbol} ${encodeValue(value)}`,
    stringClause: `Float.parseFloat(${field}) ${opSymbol} ${encodeValue(value)}`,
  };
}

// Convert a shorthand binary filter condition to painless
function shorthandBinaryToPainless(condition: ShorthandBinaryFilterCondition) {
  // Find which operator is present
  const op = BINARY_OPERATORS.find((k) => condition[k] !== undefined);
  const value = condition[op!];

  switch (op) {
    case 'neq':
      return `((${safePainlessField(condition)} instanceof Number && ${safePainlessField(
        condition
      )}.toString() != ${encodeValue(String(value))}) || ${safePainlessField(
        condition
      )} != ${encodeValue(String(value))})`;
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const field = safePainlessField(condition);
      const { numberClause, stringClause } = generateRangeComparisonClauses(
        field,
        op as 'gt' | 'gte' | 'lt' | 'lte',
        Number(value)
      );
      return `((${field} instanceof String && ${stringClause}) || ${numberClause})`;
    }
    case 'startsWith':
      return `((${safePainlessField(condition)} instanceof Number && ${safePainlessField(
        condition
      )}.toString().startsWith(${encodeValue(String(value))})) || ${safePainlessField(
        condition
      )}.startsWith(${encodeValue(String(value))}))`;
    case 'endsWith':
      return `((${safePainlessField(condition)} instanceof Number && ${safePainlessField(
        condition
      )}.toString().endsWith(${encodeValue(String(value))})) || ${safePainlessField(
        condition
      )}.endsWith(${encodeValue(String(value))}))`;
    case 'contains':
      // Behaviour is "fuzzy"
      return `((${safePainlessField(condition)} instanceof Number && ${safePainlessField(
        condition
      )}.toString().toLowerCase().contains(${encodeValue(
        String(value).toLowerCase()
      )})) || ${safePainlessField(condition)}.toLowerCase().contains(${encodeValue(
        String(value).toLowerCase()
      )}))`;
    case 'range': {
      const range = value as RangeCondition;
      const field = safePainlessField(condition);

      // Build clauses for both Number and String types using generateComparisonClauses
      const numberClauses: string[] = [];
      const stringClauses: string[] = [];

      if (range.gte !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          field,
          'gte',
          Number(range.gte)
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }
      if (range.lte !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          field,
          'lte',
          Number(range.lte)
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }
      if (range.gt !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          field,
          'gt',
          Number(range.gt)
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }
      if (range.lt !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          field,
          'lt',
          Number(range.lt)
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }

      const numberExpr = numberClauses.length > 0 ? numberClauses.join(' && ') : 'true';
      const stringExpr = stringClauses.length > 0 ? stringClauses.join(' && ') : 'true';

      return `((${field} instanceof Number && ${numberExpr}) || (${field} instanceof String && ${stringExpr}))`;
    }
    default: // eq
      return `((${safePainlessField(condition)} instanceof Number && ${safePainlessField(
        condition
      )}.toString() == ${encodeValue(String(value))}) || ${safePainlessField(
        condition
      )} == ${encodeValue(String(value))})`;
  }
}

// Convert a shorthand unary filter condition to painless
function shorthandUnaryToPainless(condition: ShorthandUnaryFilterCondition) {
  if ('exists' in condition) {
    if (typeof condition.exists === 'boolean') {
      return condition.exists
        ? `${safePainlessField(condition)} !== null`
        : `${safePainlessField(condition)} == null`;
    } else {
      throw new Error('Invalid value for exists operator, expected boolean');
    }
  }

  throw new Error('Invalid unary filter condition');
}

// Main recursive conversion to painless
export function conditionToStatement(condition: Condition, nested = false): string {
  if ('field' in condition && typeof condition.field === 'string') {
    // Shorthand unary
    if ('exists' in condition) {
      return shorthandUnaryToPainless(condition as ShorthandUnaryFilterCondition);
    }
    // Shorthand binary
    return `(${safePainlessField(condition)} !== null && ${shorthandBinaryToPainless(
      condition as ShorthandBinaryFilterCondition
    )})`;
  }
  if ('and' in condition && Array.isArray(condition.and)) {
    const and = condition.and.map((filter) => conditionToStatement(filter, true)).join(' && ');
    return nested ? `(${and})` : and;
  }
  if ('or' in condition && Array.isArray(condition.or)) {
    const or = condition.or.map((filter) => conditionToStatement(filter, true)).join(' || ');
    return nested ? `(${or})` : or;
  }
  if ('not' in condition && condition.not) {
    return `!(${conditionToStatement(condition.not, true)})`;
  }
  // Always/never conditions (if you have them)
  if ('always' in condition) {
    return `true`;
  }
  if ('never' in condition) {
    return `false`;
  }
  throw new Error('Unsupported condition');
}

export function conditionToPainless(condition: Condition): string {
  // Always/never conditions (if you have them)
  if ('never' in condition) {
    return `return false`;
  }
  if ('always' in condition) {
    return `return true`;
  }

  return `
  try {
  if (${conditionToStatement(condition)}) {
    return true;
  }
  return false;
} catch (Exception e) {
  return false;
}
`;
}
