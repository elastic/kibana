/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlViewDefinition } from '../../lib/services/resource_service/esql_view_initializer';

/**
 * Episodes list pipeline with `.alert-actions` joins (snooze/tags/ack/assignee),
 * then one row per episode — same columns as client `buildEpisodesBaseQuery`.
 *
 * This is a cluster-global view (no request-time space filter). Action joins are
 * space-keyed (`BY …, space_id`) so tags/snooze/ack from one space cannot attach
 * to another space's rows when `group_hash` / `episode_id` collide. Callers must
 * still `| WHERE space_id == …` (same pattern as `$.alert-episodes`).
 *
 * Differs from `buildEpisodesBaseQuery`, which filters `space_id` before stats
 * instead of using composite BY keys. Keep column semantics aligned when either
 * side changes.
 *
 * Do not SORT in this view: callers may apply QSTR/WHERE after FROM, and ES|QL
 * rejects QSTR after SORT. Sorting belongs on the outer list query.
 */
export const ALERT_EPISODES_ENRICHED_VIEW_NAME = '$.alert-episodes-enriched';

export const getAlertEpisodesEnrichedViewDefinition = (): EsqlViewDefinition => ({
  key: 'view:alert-episodes-enriched',
  name: ALERT_EPISODES_ENRICHED_VIEW_NAME,
  query: `FROM .rule-events, .alert-actions METADATA _source
| WHERE type == "alert" OR action_type IN ("snooze", "unsnooze", "tag", "ack", "unack", "assign")
| INLINE STATS last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze"),
               snooze_expiry = LAST(expiry, @timestamp) WHERE action_type == "snooze",
               last_tags = LAST(tags, @timestamp) WHERE action_type == "tag"
  BY group_hash, space_id
| EVAL episode_id = COALESCE(\`episode.id\`, episode_id)
| INLINE STATS last_ack_action = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
               last_assignee_uid = LAST(assignee_uid, @timestamp) WHERE action_type == "assign"
  BY episode_id, space_id
| WHERE type == "alert"
| EVAL extracted_data = JSON_EXTRACT(_source, "data")
| INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp), triggered_at = MIN(@timestamp) WHERE \`episode.status\` == "active", episode_data = LAST(extracted_data, @timestamp) WHERE extracted_data != "{}", severity = LAST(severity, @timestamp) WHERE status == "breached" AND severity IS NOT NULL BY \`episode.id\`, space_id
| EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)
| WHERE @timestamp == last_timestamp`,
});
