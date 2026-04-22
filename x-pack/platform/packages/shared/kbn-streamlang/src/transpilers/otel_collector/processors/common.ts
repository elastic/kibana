/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Render a Streamlang field path as an OTTL attribute reference.
 *
 * Dotted paths are treated as a single flat attribute key — matches the common
 * OTel SDK convention where logs arrive with dotted keys like `user.name` stored
 * as a single attribute. If a codebase emits structured nested records instead,
 * this is the single place to change.
 */
export const attributePath = (field: string): string =>
  `log.attributes[${ottlStringLiteral(field)}]`;

/**
 * Escape a string for use as an OTTL string literal. OTTL uses Go-like escapes
 * inside double quotes.
 */
export const ottlStringLiteral = (value: string): string => {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
};

/**
 * Render an arbitrary Streamlang value as an OTTL literal. Strings get quoted,
 * numbers and booleans are rendered as-is, null/undefined become `nil`, and
 * anything else is JSON-stringified and quoted as a fallback.
 */
export const ottlLiteralFromAny = (value: unknown): string => {
  if (value === null || value === undefined) return 'nil';
  if (typeof value === 'string') return ottlStringLiteral(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  return ottlStringLiteral(JSON.stringify(value));
};

/**
 * Wrap an OTTL statement body with a `where` clause if a condition expression
 * is present. The flattener upstream guarantees at most one condition per step.
 */
export const withWhereClause = (statement: string, condition?: string): string =>
  condition ? `${statement} where ${condition}` : statement;
