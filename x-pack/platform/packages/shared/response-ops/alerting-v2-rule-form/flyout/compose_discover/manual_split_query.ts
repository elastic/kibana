/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleQuery } from '../../form/types';
import { splitResultToRuleQuery } from './use_heuristic_split';

/**
 * Sandbox query shape when opting into manual split.
 *
 * Uses the same {@link splitResultToRuleQuery} heuristic as unified-editor Apply
 * in create mode. When the split succeeds, pre-populates base and alert tabs;
 * otherwise the full pipeline lives in `base` with an empty alert segment so
 * the user can define the split manually (split_failed, no_alert_condition, empty).
 */
export const enterManualSplitQuery = (fullQuery: string): RuleQuery => {
  const { query, outcome } = splitResultToRuleQuery(fullQuery);

  if (outcome === 'success' && query.format === 'composed') {
    return query;
  }

  const pipeline =
    outcome === 'no_alert_condition' && query.format === 'standalone'
      ? query.breach.query
      : fullQuery;

  return {
    format: 'composed',
    base: pipeline,
    breach: { segment: '' },
  };
};

/**
 * Sandbox query shape when returning to the unified editor: the combined pipeline
 * is stored in `base` with an empty segment so `getBreachQuery` returns it verbatim.
 */
export const exitManualSplitQuery = (combinedQuery: string): RuleQuery => ({
  format: 'composed',
  base: combinedQuery,
  breach: { segment: '' },
});
