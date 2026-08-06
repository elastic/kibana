/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NoDataStrategy, RuleQuery } from '../../form/types';

/** Form-representable no-data strategies for a composed alert query. */
const COMPOSED_VALID_STRATEGIES = new Set<NoDataStrategy>(['none', 'last_known_status', 'recover']);

/**
 * Returns the no-data strategy to use for an alert query of the given format.
 * Preserves the current value when it is still valid; otherwise returns the
 * format-appropriate default. Callers should skip `setValue` when the result
 * equals the current value to avoid dirtying an unchanged form.
 *
 * - composed: `'none' | 'last_known_status' | 'recover'` are valid; default
 *   `'last_known_status'` when missing/invalid (`emit` is YAML-only)
 * - standalone: only `'none'` is valid — kept as a defensive branch for
 *   signal→alert transitions before the heuristic rewrite lands; alert +
 *   standalone rules are YAML-only and never authored by the form
 */
export const resolveNoDataStrategyForQuery = (
  current: NoDataStrategy | undefined,
  queryFormat: RuleQuery['format']
): NoDataStrategy => {
  if (queryFormat === 'standalone') {
    return 'none';
  }
  if (current != null && COMPOSED_VALID_STRATEGIES.has(current)) {
    return current;
  }
  return 'last_known_status';
};
