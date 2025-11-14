/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolean, isString, isNil } from 'lodash';
import type {
  Condition,
  FilterCondition,
  RangeCondition,
  ShorthandBinaryFilterCondition,
  ShorthandUnaryFilterCondition,
  StringOrNumberOrBoolean,
} from '../../types/conditions';
import { BINARY_OPERATORS } from '../../types/conditions';

// Utility: get the field name from a filter condition
function safePainlessField(conditionOrField: FilterCondition | string) {
  if (typeof conditionOrField === 'string') {
    return `$('${conditionOrField}', null)`;
  }
  return `$('${conditionOrField.field}', null)`;
}

function encodeValue(value: StringOrNumberOrBoolean | null | undefined) {
  if (isString(value)) {
    return `"${value}"`;
  }
  if (isBoolean(value)) {
    return value ? 'true' : 'false';
  }
  if (isNil(value)) {
    return 'null';
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
  const safeFieldAccessor = safePainlessField(condition);
  // Find which operator is present
  const op = BINARY_OPERATORS.find((k) => condition[k] !== undefined);

  if (!op) {
    throw new Error('No valid binary operator found in condition');
  }

  const value = condition[op];

  switch (op) {
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const { numberClause, stringClause } = generateRangeComparisonClauses(
        safeFieldAccessor,
        op as 'gt' | 'gte' | 'lt' | 'lte',
        Number(value)
      );
      return `((${safeFieldAccessor} instanceof String && ${stringClause}) || ${numberClause})`;
    }
    case 'startsWith':
      return `((${safeFieldAccessor} instanceof Number && ${safeFieldAccessor}.toString().startsWith(${encodeValue(
        String(value)
      )})) || ${safeFieldAccessor}.startsWith(${encodeValue(String(value))}))`;
    case 'endsWith':
      return `((${safeFieldAccessor} instanceof Number && ${safeFieldAccessor}.toString().endsWith(${encodeValue(
        String(value)
      )})) || ${safeFieldAccessor}.endsWith(${encodeValue(String(value))}))`;
    case 'contains':
      // Behaviour is "fuzzy"
      return `((${safeFieldAccessor} instanceof Number && ${safeFieldAccessor}.toString().toLowerCase().contains(${encodeValue(
        String(value).toLowerCase()
      )})) || ${safeFieldAccessor}.toLowerCase().contains(${encodeValue(
        String(value).toLowerCase()
      )}))`;
    case 'range': {
      const range = value as RangeCondition;

      // Build clauses for both Number and String types using generateComparisonClauses
      const numberClauses: string[] = [];
      const stringClauses: string[] = [];

      if (range.gte !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          safeFieldAccessor,
          'gte',
          Number(range.gte)
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }
      if (range.lte !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          safeFieldAccessor,
          'lte',
          Number(range.lte)
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }
      if (range.gt !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          safeFieldAccessor,
          'gt',
          Number(range.gt)
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }
      if (range.lt !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          safeFieldAccessor,
          'lt',
          Number(range.lt)
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }

      const numberExpr = numberClauses.length > 0 ? numberClauses.join(' && ') : 'true';
      const stringExpr = stringClauses.length > 0 ? stringClauses.join(' && ') : 'true';

      return `((${safeFieldAccessor} instanceof Number && ${numberExpr}) || (${safeFieldAccessor} instanceof String && ${stringExpr}))`;
    }
    case 'neq':
    default: // eq
      const operator = op === 'neq' ? '!=' : '==';
      return `((${safeFieldAccessor} instanceof Number && ${safeFieldAccessor}.toString() ${operator} ${encodeValue(
        String(value)
      )}) || ${safeFieldAccessor} ${operator} ${encodeValue(value as StringOrNumberOrBoolean)})`;
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
