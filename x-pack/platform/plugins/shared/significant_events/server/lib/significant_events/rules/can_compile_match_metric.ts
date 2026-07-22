/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveQueryType } from '@kbn/streams-schema';
import { QUERY_TYPE_MATCH } from '@kbn/significant-events-schema';

/**
 * Returns true when a stored MATCH KI can be compiled into a count metric-series
 * breach query. Filter-only MATCH (`FROM` + `WHERE`, no STATS) is eligible.
 *
 * Ineligible queries must fail closed at install/promote — never fall back to
 * copying per-document rows into `.rule-events`.
 */
export function canCompileMatchMetric(esqlQuery: string): boolean {
  const trimmed = esqlQuery.trim();
  if (!trimmed) {
    return false;
  }
  return deriveQueryType(trimmed) === QUERY_TYPE_MATCH;
}

export function assertCanCompileMatchMetric(esqlQuery: string): void {
  if (!canCompileMatchMetric(esqlQuery)) {
    throw new Error(
      'MATCH query cannot be installed as a metric-series rule: expected a filter-only FROM … | WHERE … query without STATS. Refusing to install a per-document copy rule.'
    );
  }
}
