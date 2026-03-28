/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Assembles the full ES|QL query from a base query and an optional condition.
 *
 * The condition may be stored with or without a `WHERE` prefix depending on
 * whether the user has interacted with the WhereClauseEditor:
 * - Initial defaults from `splitQueryAndCondition`: `count > 100`
 * - After editor interaction: `WHERE count > 100`
 *
 * This utility normalises both forms so callers don't need to care.
 */
export const assembleFullQuery = (base?: string, condition?: string): string => {
  const b = base?.trim() ?? '';
  const c = condition?.trim() ?? '';
  if (!b) return '';
  if (!c) return b;
  if (/^WHERE\s/i.test(c)) return `${b} | ${c}`;
  return `${b} | WHERE ${c}`;
};
