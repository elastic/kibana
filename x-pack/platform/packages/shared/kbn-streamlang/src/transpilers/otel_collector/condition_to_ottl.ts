/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Condition,
  type FilterCondition,
  isAlwaysCondition,
  isAndCondition,
  isFilterCondition,
  isNeverCondition,
  isNotCondition,
  isOrCondition,
} from '../../../types/conditions';
import { attributePath, ottlLiteralFromAny, ottlStringLiteral } from './processors/common';

/**
 * Convert a Streamlang `Condition` AST to an OTTL boolean expression string.
 *
 * Produces the expression form used inside `where` clauses and filter-processor
 * `log_conditions` entries. The output is parenthesized conservatively so nested
 * AND/OR/NOT combinations preserve precedence regardless of OTTL's parser.
 */
export const conditionToOttl = (condition: Condition): string => {
  if (isAndCondition(condition)) {
    if (condition.and.length === 0) return 'true';
    return condition.and.map((c) => parenthesize(conditionToOttl(c))).join(' and ');
  }

  if (isOrCondition(condition)) {
    if (condition.or.length === 0) return 'false';
    return condition.or.map((c) => parenthesize(conditionToOttl(c))).join(' or ');
  }

  if (isNotCondition(condition)) {
    return `not ${parenthesize(conditionToOttl(condition.not))}`;
  }

  if (isAlwaysCondition(condition)) return 'true';
  if (isNeverCondition(condition)) return 'false';

  if (isFilterCondition(condition)) {
    return filterConditionToOttl(condition);
  }

  // Unreachable if input has been validated by zod. Fail closed.
  return 'false';
};

const filterConditionToOttl = (condition: FilterCondition): string => {
  const field = attributePath(condition.field);

  if ('eq' in condition) {
    return `${field} == ${ottlLiteralFromAny(condition.eq)}`;
  }
  if ('neq' in condition) {
    return `${field} != ${ottlLiteralFromAny(condition.neq)}`;
  }
  if ('gt' in condition) {
    return `${field} > ${ottlLiteralFromAny(condition.gt)}`;
  }
  if ('gte' in condition) {
    return `${field} >= ${ottlLiteralFromAny(condition.gte)}`;
  }
  if ('lt' in condition) {
    return `${field} < ${ottlLiteralFromAny(condition.lt)}`;
  }
  if ('lte' in condition) {
    return `${field} <= ${ottlLiteralFromAny(condition.lte)}`;
  }
  if ('exists' in condition) {
    return condition.exists ? `${field} != nil` : `${field} == nil`;
  }
  if ('range' in condition && condition.range) {
    const parts: string[] = [];
    if (condition.range.gt !== undefined)
      parts.push(`${field} > ${ottlLiteralFromAny(condition.range.gt)}`);
    if (condition.range.gte !== undefined)
      parts.push(`${field} >= ${ottlLiteralFromAny(condition.range.gte)}`);
    if (condition.range.lt !== undefined)
      parts.push(`${field} < ${ottlLiteralFromAny(condition.range.lt)}`);
    if (condition.range.lte !== undefined)
      parts.push(`${field} <= ${ottlLiteralFromAny(condition.range.lte)}`);
    if (parts.length === 0) return 'true';
    if (parts.length === 1) return parts[0];
    return parts.map(parenthesize).join(' and ');
  }
  if ('contains' in condition) {
    return `IsMatch(${field}, ${ottlStringLiteral(escapeRegex(String(condition.contains)))})`;
  }
  if ('startsWith' in condition) {
    // Wrap in String(...) because HasPrefix's first arg is a strict StringGetter
    // and raises TypeError on non-string inputs (unlike IsMatch).
    return `HasPrefix(String(${field}), ${ottlStringLiteral(String(condition.startsWith))})`;
  }
  if ('endsWith' in condition) {
    return `HasSuffix(String(${field}), ${ottlStringLiteral(String(condition.endsWith))})`;
  }
  if ('includes' in condition) {
    // OTTL has no first-class list-contains; best-effort via regex on JSON-encoded slice.
    // Same value is rendered as JSON here so the regex matches the OTTL String() rendering of a list.
    const encoded = JSON.stringify(condition.includes);
    return `IsMatch(String(${field}), ${ottlStringLiteral(escapeRegex(encoded))})`;
  }

  return 'false';
};

const parenthesize = (expr: string): string => {
  // Primitive literals never need wrapping. For everything else we wrap
  // unconditionally: redundant parens like `((a))` are harmless but dropping
  // them based on a shallow `startsWith("(")` check is unsafe for expressions
  // like `(a) or (b)` where the outer parens don't cover the whole string.
  if (expr === 'true' || expr === 'false') return expr;
  return `(${expr})`;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
