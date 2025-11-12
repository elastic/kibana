/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Condition,
  FilterCondition,
  ShorthandBinaryFilterCondition,
  ShorthandUnaryFilterCondition,
} from '../../../types/conditions';
import { fieldToOTTLGetter } from './field_mapping';
import { escapeOTTLString, valueToOTTLLiteral } from './ottl_helpers';

/**
 * Converts a Streamlang condition to an OTTL expression
 *
 * Examples:
 * - { field: 'attributes.status', eq: 'active' }
 *   → attributes["status"] == "active"
 *
 * - { and: [{ field: 'a', eq: 1 }, { field: 'b', gt: 5 }] }
 *   → (attributes["a"] == 1 and attributes["b"] > 5)
 *
 * - { not: { field: 'x', exists: true } }
 *   → attributes["x"] == nil
 *
 * @param condition The Streamlang condition
 * @returns The OTTL expression string
 */
export function convertConditionToOTTL(condition: Condition): string {
  // Handle logical operators
  if ('and' in condition) {
    const parts = condition.and.map(convertConditionToOTTL);
    return `(${parts.join(' and ')})`;
  }

  if ('or' in condition) {
    const parts = condition.or.map(convertConditionToOTTL);
    return `(${parts.join(' or ')})`;
  }

  if ('not' in condition) {
    return `not (${convertConditionToOTTL(condition.not)})`;
  }

  // Handle special conditions
  if ('always' in condition) {
    return 'true';
  }

  if ('never' in condition) {
    return 'false';
  }

  // Handle field conditions
  if ('field' in condition) {
    return convertFilterConditionToOTTL(condition);
  }

  throw new Error(`Unknown condition type: ${JSON.stringify(condition)}`);
}

/**
 * Converts a field-based filter condition to OTTL
 */
function convertFilterConditionToOTTL(condition: FilterCondition): string {
  const field = fieldToOTTLGetter(condition.field);

  // Check for binary operators
  if (isBinaryCondition(condition)) {
    return convertBinaryConditionToOTTL(field, condition);
  }

  // Check for unary operators
  if (isUnaryCondition(condition)) {
    return convertUnaryConditionToOTTL(field, condition);
  }

  throw new Error(`Unknown filter condition: ${JSON.stringify(condition)}`);
}

/**
 * Type guard for binary conditions
 */
function isBinaryCondition(
  condition: FilterCondition
): condition is ShorthandBinaryFilterCondition {
  return (
    'eq' in condition ||
    'neq' in condition ||
    'lt' in condition ||
    'lte' in condition ||
    'gt' in condition ||
    'gte' in condition ||
    'contains' in condition ||
    'startsWith' in condition ||
    'endsWith' in condition ||
    'range' in condition
  );
}

/**
 * Type guard for unary conditions
 */
function isUnaryCondition(condition: FilterCondition): condition is ShorthandUnaryFilterCondition {
  return 'exists' in condition;
}

/**
 * Converts binary operator conditions to OTTL
 */
function convertBinaryConditionToOTTL(
  field: string,
  condition: ShorthandBinaryFilterCondition
): string {
  if ('eq' in condition && condition.eq !== undefined) {
    return `${field} == ${valueToOTTLLiteral(condition.eq)}`;
  }

  if ('neq' in condition && condition.neq !== undefined) {
    return `${field} != ${valueToOTTLLiteral(condition.neq)}`;
  }

  if ('lt' in condition && condition.lt !== undefined) {
    return `${field} < ${valueToOTTLLiteral(condition.lt)}`;
  }

  if ('lte' in condition && condition.lte !== undefined) {
    return `${field} <= ${valueToOTTLLiteral(condition.lte)}`;
  }

  if ('gt' in condition && condition.gt !== undefined) {
    return `${field} > ${valueToOTTLLiteral(condition.gt)}`;
  }

  if ('gte' in condition && condition.gte !== undefined) {
    return `${field} >= ${valueToOTTLLiteral(condition.gte)}`;
  }

  if ('contains' in condition && condition.contains !== undefined) {
    const escapedValue = escapeOTTLString(String(condition.contains));
    return `IsMatch(${field}, ".*${escapedValue}.*")`;
  }

  if ('startsWith' in condition && condition.startsWith !== undefined) {
    const escapedValue = escapeOTTLString(String(condition.startsWith));
    return `IsMatch(${field}, "^${escapedValue}")`;
  }

  if ('endsWith' in condition && condition.endsWith !== undefined) {
    const escapedValue = escapeOTTLString(String(condition.endsWith));
    return `IsMatch(${field}, "${escapedValue}$")`;
  }

  if ('range' in condition && condition.range) {
    const parts: string[] = [];

    if (condition.range.gt !== undefined) {
      parts.push(`${field} > ${valueToOTTLLiteral(condition.range.gt)}`);
    }
    if (condition.range.gte !== undefined) {
      parts.push(`${field} >= ${valueToOTTLLiteral(condition.range.gte)}`);
    }
    if (condition.range.lt !== undefined) {
      parts.push(`${field} < ${valueToOTTLLiteral(condition.range.lt)}`);
    }
    if (condition.range.lte !== undefined) {
      parts.push(`${field} <= ${valueToOTTLLiteral(condition.range.lte)}`);
    }

    if (parts.length === 0) {
      throw new Error('Range condition must have at least one bound');
    }

    return parts.length === 1 ? parts[0] : `(${parts.join(' and ')})`;
  }

  throw new Error(`Unknown binary condition operator: ${JSON.stringify(condition)}`);
}

/**
 * Converts unary operator conditions to OTTL
 */
function convertUnaryConditionToOTTL(
  field: string,
  condition: ShorthandUnaryFilterCondition
): string {
  if ('exists' in condition && condition.exists !== undefined) {
    return condition.exists ? `${field} != nil` : `${field} == nil`;
  }

  throw new Error(`Unknown unary condition operator: ${JSON.stringify(condition)}`);
}
