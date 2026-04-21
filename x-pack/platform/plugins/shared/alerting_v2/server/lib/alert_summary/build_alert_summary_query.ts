/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type EsqlRequest } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '../../resources/datastreams/alert_events';

export interface BuildAlertSummaryQueryOptions {
  /** Inclusive start of the time range (ISO-8601 or any value Elasticsearch can parse as a datetime). */
  gte: string;
  /** Inclusive end of the time range. */
  lte: string;
  /**
   * ES|QL time duration literal used as the BUCKET() size, e.g. `1 hour`, `30 minutes`, `1 day`.
   * Validated against `SAFE_FIXED_INTERVAL` before being inlined as a raw token into the query,
   * because ES|QL time-duration literals cannot be parameterised.
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
export function buildAlertSummaryQuery(opts: BuildAlertSummaryQueryOptions): EsqlRequest {
  const { gte, lte, fixedInterval, ruleIds, spaceId } = opts;

  if (ruleIds.length === 0) {
    throw new Error('buildAlertSummaryQuery: ruleIds must not be empty');
  }
  if (!SAFE_FIXED_INTERVAL.test(fixedInterval)) {
    throw new Error(
      `buildAlertSummaryQuery: fixedInterval "${fixedInterval}" is not a valid ES|QL time duration`
    );
  }

  const ruleIdLiterals = ruleIds.map((id) => esql.str(id));
  const bucketInterval = esql.kwd(fixedInterval.trim());
  const ruleIdCol = esql.col(['rule', 'id']);

  return esql`FROM ${ALERT_EVENTS_DATA_STREAM}
    | WHERE type == "alert"
        AND space_id == ${{ spaceId }}
        AND @timestamp >= ${{ gte }}::datetime
        AND @timestamp <= ${{ lte }}::datetime
        AND ${ruleIdCol} IN (${ruleIdLiterals})
    | STATS
        active_events = COUNT(*) WHERE status == "breached",
        recovered_events = COUNT(*) WHERE status == "recovered"
        BY bucket = BUCKET(@timestamp, ${bucketInterval})
    | SORT bucket ASC`.toRequest();
}
