/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchContext } from '@kbn/presentation-publishing';
import { summarizeFilters, summarizeQuery } from './build_dashboard_context';

/** Stable key for dashboard time range / query / filters used for stale detection. */
export function getAiInsightsContextFingerprint(fetchContext: FetchContext): string {
  const timeRange = fetchContext.timeRange ?? { from: 'now-15m', to: 'now' };
  return JSON.stringify({
    from: timeRange.from,
    to: timeRange.to,
    query: summarizeQuery(fetchContext.query) ?? '',
    filters: summarizeFilters(fetchContext.filters) ?? '',
  });
}
