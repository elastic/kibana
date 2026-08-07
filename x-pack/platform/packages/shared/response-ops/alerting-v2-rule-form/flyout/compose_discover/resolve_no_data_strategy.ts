/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NoDataStrategy } from '../../form/types';

/** Form-representable no-data strategies for a composed alert query. */
const COMPOSED_VALID_STRATEGIES = new Set<NoDataStrategy>(['none', 'last_known_status', 'recover']);

/**
 * Returns the no-data strategy to use for a composed alert query — the only
 * shape the form authors alert queries as. Preserves the current value when
 * it is still valid; otherwise defaults to `'last_known_status'`
 * (`emit` is YAML-only). Callers should skip `setValue` when the result
 * equals the current value to avoid dirtying an unchanged form.
 */
export const resolveNoDataStrategyForQuery = (
  current: NoDataStrategy | undefined
): NoDataStrategy => {
  if (current != null && COMPOSED_VALID_STRATEGIES.has(current)) {
    return current;
  }
  return 'last_known_status';
};
