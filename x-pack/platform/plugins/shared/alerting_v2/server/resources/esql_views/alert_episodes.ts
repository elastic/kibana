/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlViewDefinition } from '../../lib/services/resource_service/esql_view_initializer';

/**
 * Shared query body used by both the canonical `$.alerts-v2` view and the
 * deprecated `$.alert-episodes` alias.  Both names resolve to the same
 * projection so that saved queries, demos and runbooks written against either
 * name continue to work.
 *
 * Columns returned use `alert.*` field names (matching the `.rule-events`
 * mapping).  The alias is removed in follow-up S4; see the plan for the
 * deletion procedure.
 */
const ALERTS_V2_QUERY = `FROM .rule-events
| WHERE @timestamp > NOW() - 90 days
| INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp) BY alert.id
| EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)
| WHERE @timestamp == last_timestamp AND type == "alert"
| SORT @timestamp DESC`;

/** Canonical view name — use this in all new docs, demos and queries. */
export const getAlertsV2ViewDefinition = (): EsqlViewDefinition => ({
  key: 'view:alerts-v2',
  name: '$.alerts-v2',
  query: ALERTS_V2_QUERY,
});

/**
 * Deprecated alias kept for backward compatibility.  Returns the same query
 * body as `$.alerts-v2`; only the registered name differs.
 *
 * @deprecated Use `$.alerts-v2`.  This alias will be removed in a follow-up
 * PR (S4) once saved queries and documentation have been updated.
 */
export const getAlertEpisodesViewDefinition = (): EsqlViewDefinition => ({
  key: 'view:alert-episodes',
  name: '$.alert-episodes',
  query: ALERTS_V2_QUERY,
});
