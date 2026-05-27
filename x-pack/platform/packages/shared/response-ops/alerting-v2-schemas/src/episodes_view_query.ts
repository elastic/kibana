/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';

export const ALERT_EVENTS_DATA_STREAM = '.rule-events';
export const ALERT_ACTIONS_DATA_STREAM = '.alert-actions';

export const addGroupHashActionStats = (query: ComposerQuery) => {
  // prettier-ignore
  query
    .pipe`INLINE STATS last_deactivate_action = LAST(action_type, @timestamp) WHERE action_type IN ("deactivate", "activate"),
                       last_snooze_action     = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze"),
                       snooze_expiry          = LAST(expiry, @timestamp)      WHERE action_type == "snooze",
                       last_tags              = LAST(tags, @timestamp)        WHERE action_type == "tag"
          BY group_hash`;
};

export const addEpisodeIdActionStats = (query: ComposerQuery) => {
  // `.rule-events` documents carry the nested `episode.id`, while `.alert-actions`
  // documents carry a flat `episode_id` — unify them so INLINE STATS groups both
  // sides under the same key.
  // prettier-ignore
  query
    .pipe`EVAL episode_id = COALESCE(\`episode.id\`, episode_id)`
    .pipe`INLINE STATS last_ack_action      = LAST(action_type,  @timestamp) WHERE action_type IN ("ack", "unack"),
                       last_assignee_uid    = LAST(assignee_uid, @timestamp) WHERE action_type == "assign"
          BY episode_id`;
};

export const addEpisodeAggregation = (query: ComposerQuery) => {
  // prettier-ignore
  query
    .pipe`EVAL extracted_data = JSON_EXTRACT(_source, "data")`
    .pipe`INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp), episode_data = LAST(extracted_data, @timestamp) WHERE extracted_data != "{}" BY episode.id`
    .pipe`EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)`
    .pipe`WHERE @timestamp == last_timestamp`;
};

// TODO: PoC placement — this builder lives here because the server-side ES|QL view
// registration (alert_episodes.ts) needs .print('basic') at startup and cannot import
// shared-browser packages. For production, consider moving all episodes query builders
// (currently in @kbn/alerting-v2-episodes-ui) into this package or a dedicated
// shared-common package (e.g. @kbn/alerting-v2-episodes-common).

/**
 * Builds the ES|QL query for the `$.alert-episodes` view.
 *
 * Joins `.rule-events` and `.alert-actions` to surface per-episode action state
 * (tags, assignee, snooze, deactivation). Equivalent to the episodes list page
 * query but without space filtering — space isolation is handled by Kibana's
 * security layer at query time.
 */
export const buildEpisodesViewQuery = (): ComposerQuery => {
  const query = esql.from([ALERT_EVENTS_DATA_STREAM, ALERT_ACTIONS_DATA_STREAM], ['_source'])
    .where`type == "alert" OR action_type IN ("deactivate", "activate", "snooze", "unsnooze", "tag", "ack", "unack", "assign")`;

  addGroupHashActionStats(query);
  addEpisodeIdActionStats(query);
  query.where`type == "alert"`;
  addEpisodeAggregation(query);
  query.pipe`EVAL effective_status = CASE(last_deactivate_action == "deactivate", "inactive", \`episode.status\`)`;
  query.pipe`SORT @timestamp DESC`;

  return query;
};
