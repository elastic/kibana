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
import { painlessFieldAccessor } from '../../types/utils';

// Utility: get the field name from a filter condition
function safePainlessField(conditionOrField: FilterCondition | string) {
  if (typeof conditionOrField === 'string') {
    return painlessFieldAccessor(conditionOrField);
  }
  return painlessFieldAccessor(conditionOrField.field);
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

// Helper function to evaluate date math expressions in Painless
function evaluateDateMath(expression: string): string {
  const expr = String(expression).trim();

  // Check if it's a date math expression (contains 'now' or '||')
  if (expr.includes('now') || expr.includes('||')) {
    let code: string;
    let remainingExpr: string;

    // Parse the anchor date and any subsequent operations
    if (expr.startsWith('now')) {
      // Anchor is 'now'
      code = 'System.currentTimeMillis()';
      remainingExpr = expr.substring(3); // Remove 'now'
    } else if (expr.includes('||')) {
      // Anchor is a date string with ||
      const [dateStr, mathExpr] = expr.split('||');

      // Normalize various date formats to ISO format for Painless
      const normalizedDate = normalizeDateString(dateStr.trim());

      // Parse the date string to get milliseconds
      code = `Instant.parse(${encodeValue(normalizedDate)}).toEpochMilli()`;
      remainingExpr = mathExpr || '';
    } else {
      // Not a valid date math expression
      const encoded = encodeValue(String(expression));
      return typeof encoded === 'string' ? encoded : String(encoded);
    }

    // Milliseconds per unit for offset calculations
    const msPerUnit: Record<string, number> = {
      y: 365.25 * 24 * 60 * 60 * 1000, // approximate year
      M: 30 * 24 * 60 * 60 * 1000, // approximate month
      w: 7 * 24 * 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      H: 60 * 60 * 1000,
      m: 60 * 1000,
      s: 1000,
    };

    // Parse and apply all offset operations (e.g., +1M, -1d)
    const offsetRegex = /([+-])(\d+)([yMwdhHms])/g;
    let match;
    while ((match = offsetRegex.exec(remainingExpr)) !== null) {
      const sign = match[1];
      const amount = parseInt(match[2], 10);
      const unit = match[3];

      const ms = msPerUnit[unit];
      if (ms) {
        const offsetMs = amount * ms;
        code = sign === '+' ? `(${code} + ${offsetMs}L)` : `(${code} - ${offsetMs}L)`;
      }
    }

    // Parse and apply rounding operation (e.g., /d)
    const roundMatch = remainingExpr.match(/\/([yMwdhHms])/);
    if (roundMatch) {
      const roundUnit = roundMatch[1];
      const roundMs = msPerUnit[roundUnit];
      if (roundMs) {
        // Round down to the nearest unit
        code = `((long)(${code} / ${roundMs}L) * ${roundMs}L)`;
      }
    }

    // Convert milliseconds to ISO date string for comparison
    return `(Instant.ofEpochMilli(${code}).toString())`;
  }

  // Not a date math expression, return as-is (already quoted by encodeValue)
  const encoded = encodeValue(String(expression));
  return typeof encoded === 'string' ? encoded : String(encoded);
}

// Helper to normalize various date formats to ISO format
function normalizeDateString(dateStr: string): string {
  // Try to parse and convert common date formats to ISO
  // Support formats like: 2001.02.01, 2001-02-01, 2001/02/01

  // Replace dots or slashes with dashes
  let normalized = dateStr.replace(/\./g, '-').replace(/\//g, '-');

  // If it's just a date (no time), add time component for ISO format
  if (!normalized.includes('T') && !normalized.includes(' ')) {
    normalized += 'T00:00:00Z';
  } else if (normalized.includes(' ')) {
    // Replace space with T for ISO format
    normalized = normalized.replace(' ', 'T');
    if (!normalized.endsWith('Z') && !normalized.includes('+') && !normalized.includes('-', 10)) {
      normalized += 'Z';
    }
  }

  // Ensure it ends with Z if no timezone specified
  if (!normalized.endsWith('Z') && !normalized.includes('+') && !normalized.includes('-', 10)) {
    normalized += 'Z';
  }

  return normalized;
}

function generateRangeComparisonClauses(
  field: string,
  operator: 'gt' | 'gte' | 'lt' | 'lte',
  value: StringOrNumberOrBoolean
): { numberClause: string; stringClause: string } {
  const opMap: Record<typeof operator, string> = {
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
  };
  const opSymbol = opMap[operator];

  // Check if the value is numeric
  const numericValue = typeof value === 'number' ? value : Number(value);
  const isNumeric = !isNaN(numericValue);

  if (isNumeric) {
    // Handle numeric comparisons (integers, floats)
    return {
      numberClause: `${field} ${opSymbol} ${encodeValue(numericValue)}`,
      stringClause: `Float.parseFloat(${field}) ${opSymbol} ${encodeValue(numericValue)}`,
    };
  } else {
    // Check if it's a date math expression
    const stringValue = String(value);
    const comparisonValue = evaluateDateMath(stringValue);

    // Handle string comparisons (dates, etc.) - use compareTo for strings
    return {
      numberClause: `String.valueOf(${field}).compareTo(${comparisonValue}) ${opSymbol} 0`,
      stringClause: `${field}.compareTo(${comparisonValue}) ${opSymbol} 0`,
    };
  }
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
          range.gte
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }
      if (range.lte !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          safeFieldAccessor,
          'lte',
          range.lte
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }
      if (range.gt !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          safeFieldAccessor,
          'gt',
          range.gt
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }
      if (range.lt !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          safeFieldAccessor,
          'lt',
          range.lt
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
