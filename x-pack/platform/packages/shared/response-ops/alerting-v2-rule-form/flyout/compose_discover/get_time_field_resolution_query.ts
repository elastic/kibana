/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAnySourceCommandFromESQLQuery } from '@kbn/esql-utils';
import type { RuleQuery } from '../../form/types';
import { getBreachQuery } from '../../form/utils/query_helpers';

/**
 * Returns the ES|QL query used to resolve index date fields for time-field
 * selection. Uses the base query in alert (tracking) mode and the full breach
 * query in signal mode.
 *
 * Alert + standalone is YAML-only and never authored by the form, but the
 * Query sandbox still opens from YAML mode — those rules have no composed
 * base, so fall back to `breach.query` for field-caps resolution.
 *
 * Any registered ES|QL source command (FROM, TS, PROMQL, ROW, SHOW, …) is
 * eligible; the language registry is the source of truth so new commands do
 * not need a local allowlist.
 */
export function getTimeFieldResolutionQuery(
  query: RuleQuery,
  isAlert: boolean,
  queryCommitted: boolean
): string {
  const baseQuery = query.format === 'composed' ? query.base : '';
  const fullQuery = getBreachQuery(query);
  // Prefer composed base for alerts; YAML-only standalone alerts only have breach.query.
  const candidate = isAlert ? baseQuery || fullQuery : fullQuery;
  return queryCommitted && Boolean(getAnySourceCommandFromESQLQuery(candidate)) ? candidate : '';
}
