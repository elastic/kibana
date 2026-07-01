/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleQuery } from '../../form/types';

/**
 * Sandbox query shape when opting into manual split: the full pipeline lives in
 * `base` and the alert segment starts empty for the user to define.
 */
export const enterManualSplitQuery = (fullQuery: string): RuleQuery => ({
  format: 'composed',
  base: fullQuery,
  breach: { segment: '' },
});

/**
 * Sandbox query shape when returning to the unified editor: the combined pipeline
 * is stored in `base` with an empty segment so `getBreachQuery` returns it verbatim.
 */
export const exitManualSplitQuery = (combinedQuery: string): RuleQuery => ({
  format: 'composed',
  base: combinedQuery,
  breach: { segment: '' },
});
