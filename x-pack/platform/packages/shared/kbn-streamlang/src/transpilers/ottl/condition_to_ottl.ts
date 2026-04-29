/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Condition,
  ShorthandBinaryFilterCondition,
  ShorthandUnaryFilterCondition,
  StringOrNumberOrBoolean,
} from '../../../types/conditions';
import {
  isAndCondition,
  isOrCondition,
  isNotCondition,
  isAlwaysCondition,
  isNeverCondition,
  isBinaryFilterCondition,
  isUnaryFilterCondition,
  BINARY_OPERATORS,
} from '../../../types/conditions';
import type { SchemaContext } from './field_path';
import { fieldToOttl } from './field_path';

/**
 * Convert a StreamLang Condition to an OTTL boolean expression string.
 */
export function conditionToOttl(condition: Condition, schemaContext: SchemaContext): string {
  if (isAlwaysCondition(condition)) {
    return 'true';
  }
  if (isNeverCondition(condition)) {
    return 'false';
  }
  if (isAndCondition(condition)) {
    const parts = condition.and.map((c) => conditionToOttl(c, schemaContext));
    return parts.length === 1 ? parts[0] : parts.map((p) => `(${p})`).join(' and ');
  }
  if (isOrCondition(condition)) {
    const parts = condition.or.map((c) => conditionToOttl(c, schemaContext));
    return parts.length === 1 ? parts[0] : parts.map((p) => `(${p})`).join(' or ');
  }
  if (isNotCondition(condition)) {
    return `not (${conditionToOttl(condition.not, schemaContext)})`;
  }
  if (isUnaryFilterCondition(condition)) {
    return unaryToOttl(condition, schemaContext);
  }
  if (isBinaryFilterCondition(condition)) {
    return binaryToOttl(condition, schemaContext);
  }
  throw new Error(`Unsupported condition type: ${JSON.stringify(condition)}`);
}

function unaryToOttl(cond: ShorthandUnaryFilterCondition, schemaContext: SchemaContext): string {
  const accessor = fieldToOttl(cond.field, schemaContext);
  if (cond.exists === false) {
    return `${accessor} == nil`;
  }
  return `${accessor} != nil`;
}

function binaryToOttl(cond: ShorthandBinaryFilterCondition, schemaContext: SchemaContext): string {
  const accessor = fieldToOttl(cond.field, schemaContext);

  // Find which operator is set
  for (const op of BINARY_OPERATORS) {
    const value = cond[op as keyof ShorthandBinaryFilterCondition];
    if (value === undefined) continue;

    if (op === 'range') {
      return rangeToOttl(accessor, value as Record<string, StringOrNumberOrBoolean>);
    }

    const ottlValue = valueToOttl(value as StringOrNumberOrBoolean);

    switch (op) {
      case 'eq':
        return `${accessor} == ${ottlValue}`;
      case 'neq':
        return `${accessor} != ${ottlValue}`;
      case 'lt':
        return `${accessor} < ${ottlValue}`;
      case 'lte':
        return `${accessor} <= ${ottlValue}`;
      case 'gt':
        return `${accessor} > ${ottlValue}`;
      case 'gte':
        return `${accessor} >= ${ottlValue}`;
      case 'contains':
        return `IsMatch(${accessor}, "*${escapeGlob(String(value))}*")`;
      case 'startsWith':
        return `IsMatch(${accessor}, "${escapeGlob(String(value))}*")`;
      case 'endsWith':
        return `IsMatch(${accessor}, "*${escapeGlob(String(value))}")`;
      case 'includes':
        // For multi-value fields: check if array contains value
        return `${accessor} != nil and IsMatch(${accessor}, "*${escapeGlob(String(value))}*")`;
      default:
        throw new Error(`Unsupported OTTL operator: ${op}`);
    }
  }

  throw new Error(`No operator found in binary condition: ${JSON.stringify(cond)}`);
}

function rangeToOttl(
  accessor: string,
  range: Record<string, StringOrNumberOrBoolean>
): string {
  const parts: string[] = [];
  if (range.gt !== undefined) parts.push(`${accessor} > ${valueToOttl(range.gt)}`);
  if (range.gte !== undefined) parts.push(`${accessor} >= ${valueToOttl(range.gte)}`);
  if (range.lt !== undefined) parts.push(`${accessor} < ${valueToOttl(range.lt)}`);
  if (range.lte !== undefined) parts.push(`${accessor} <= ${valueToOttl(range.lte)}`);
  return parts.join(' and ');
}

function valueToOttl(value: StringOrNumberOrBoolean): string {
  if (typeof value === 'string') return `"${escapeOttlString(value)}"`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function escapeOttlString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeGlob(s: string): string {
  // Escape glob special chars: * ? [ ]
  return s.replace(/[*?[\]]/g, '\\$&');
}
