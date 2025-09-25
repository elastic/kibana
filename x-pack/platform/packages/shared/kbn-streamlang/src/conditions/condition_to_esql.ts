/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '../../types/conditions';
import {
  isFilterCondition,
  isAndCondition,
  isOrCondition,
  isNotCondition,
  isAlwaysCondition,
} from '../../types/conditions';

// Helper to format values for ES|QL literal arguments (e.g., "string", true, 123)
export function formatValueForESQLLiteral(value: any): string {
  if (typeof value === 'string') {
    return JSON.stringify(value); // Handles escaping quotes
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return 'null';
  }
  return JSON.stringify(value); // Fallback for objects/arrays if they can be compared
}

export function conditionToESQL(condition: Condition): string {
  if (isFilterCondition(condition)) {
    const field = condition.field;

    if ('eq' in condition) {
      return `${field} == ${formatValueForESQLLiteral(condition.eq)}`;
    }
    if ('neq' in condition) {
      return `${field} != ${formatValueForESQLLiteral(condition.neq)}`;
    }
    if ('gt' in condition) {
      return `${field} > ${formatValueForESQLLiteral(condition.gt)}`;
    }
    if ('gte' in condition) {
      return `${field} >= ${formatValueForESQLLiteral(condition.gte)}`;
    }
    if ('lt' in condition) {
      return `${field} < ${formatValueForESQLLiteral(condition.lt)}`;
    }
    if ('lte' in condition) {
      return `${field} <= ${formatValueForESQLLiteral(condition.lte)}`;
    }
    if ('exists' in condition) {
      if (condition.exists === true) {
        return `${field} IS NOT NULL`;
      } else {
        return `${field} IS NULL`;
      }
    }
    if ('range' in condition) {
      if (condition.range) {
        const parts: string[] = [];
        if (condition.range.gt !== undefined)
          parts.push(`${field} > ${formatValueForESQLLiteral(condition.range.gt)}`);
        if (condition.range.gte !== undefined)
          parts.push(`${field} >= ${formatValueForESQLLiteral(condition.range.gte)}`);
        if (condition.range.lt !== undefined)
          parts.push(`${field} < ${formatValueForESQLLiteral(condition.range.lt)}`);
        if (condition.range.lte !== undefined)
          parts.push(`${field} <= ${formatValueForESQLLiteral(condition.range.lte)}`);
        return `(${parts.join(' AND ')})`;
      }
    }
    if ('contains' in condition) {
      return `${field} LIKE %${formatValueForESQLLiteral(condition.contains)}%`;
    }
    if ('startsWith' in condition) {
      return `${field} LIKE ${formatValueForESQLLiteral(condition.startsWith)}%`;
    }
    if ('endsWith' in condition) {
      return `${field} LIKE %${formatValueForESQLLiteral(condition.endsWith)}`;
    }
  } else if (isAndCondition(condition)) {
    const andConditions = condition.and.map((c) => conditionToESQL(c));
    return `(${andConditions.join(' AND ')})`;
  } else if (isOrCondition(condition)) {
    const orConditions = condition.or.map((c) => conditionToESQL(c));
    return `(${orConditions.join(' OR ')})`;
  } else if (isNotCondition(condition)) {
    const notCondition = conditionToESQL(condition.not);
    return `NOT(${notCondition})`;
  } else if (isAlwaysCondition(condition)) {
    return 'true';
  }

  return 'false';
}
