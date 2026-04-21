/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { ALERT_EVENTS_DATA_STREAM } from '../../resources/datastreams/alert_events';

export interface BuildAlertSummaryQueryOptions {
  /** Inclusive start of the time range (ISO-8601 or any value Elasticsearch can parse as a datetime). */
  gte: string;
  /** Inclusive end of the time range. */
  lte: string;
  /**
   * ES|QL time duration literal used as the BUCKET() size, e.g. `1 hour`, `30 minutes`, `1 day`.
   * Must be validated by the caller; this value is inlined into the query text.
   */
  fixedInterval: string;
  /** Rule ids to include. Must be non-empty; callers should short-circuit when the list is empty. */
  ruleIds: string[];
  /** Space id used to scope the query. */
  spaceId: string;
}

/**
 * Validates the set of characters allowed inside an ES|QL time duration literal.
 * Prevents callers from injecting additional ES|QL clauses via `fixedInterval`.
 */
const SAFE_FIXED_INTERVAL = /^\s*\d+\s+[a-zA-Z]+\s*$/;

/**
 * Builds the canonical ES|QL request for the v2 alert summary endpoint.
 *
 * The query counts alert events (type == "alert") in the requested time range
 * and splits the totals by bucket for active (status == "breached") and
 * recovered (status == "recovered") series.
 *
 * Callers are expected to short-circuit when `ruleIds` is empty – the endpoint
 * contract is "no rules, no data". Passing an empty list here will throw.
 */
export function buildAlertSummaryQuery(
  opts: BuildAlertSummaryQueryOptions
): Required<Pick<EsqlQueryRequest, 'query' | 'params'>> {
  const { gte, lte, fixedInterval, ruleIds, spaceId } = opts;

  if (ruleIds.length === 0) {
    throw new Error('buildAlertSummaryQuery: ruleIds must not be empty');
  }
  if (!SAFE_FIXED_INTERVAL.test(fixedInterval)) {
    throw new Error(
      `buildAlertSummaryQuery: fixedInterval "${fixedInterval}" is not a valid ES|QL time duration`
    );
  }

  const ruleIdPlaceholders = ruleIds.map((_, i) => `?rule_id_${i}`).join(', ');

  const query = [
    `FROM ${ALERT_EVENTS_DATA_STREAM}`,
    `| WHERE type == "alert"`,
    `    AND space_id == ?space_id`,
    `    AND @timestamp >= ?_tstart::DATETIME`,
    `    AND @timestamp <= ?_tend::DATETIME`,
    `    AND \`rule.id\` IN (${ruleIdPlaceholders})`,
    `| STATS`,
    `    active_events    = COUNT(*) WHERE status == "breached",`,
    `    recovered_events = COUNT(*) WHERE status == "recovered"`,
    `    BY bucket = BUCKET(@timestamp, ${fixedInterval.trim()})`,
    `| SORT bucket ASC`,
  ].join('\n');

  const params: EsqlQueryRequest['params'] = [
    { _tstart: gte },
    { _tend: lte },
    { space_id: spaceId },
    ...ruleIds.map((id, i) => ({ [`rule_id_${i}`]: id })),
  ];

  return { query, params };
}
