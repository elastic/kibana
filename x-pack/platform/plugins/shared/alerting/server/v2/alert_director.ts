/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_EVENTS_INDEX, ALERT_TRANSITIONS_INDEX } from './create_indices';

export const DIRECTOR_INTERVAL_MS = 1000;
export const ADDITIONAL_LOOKBACK_MS = 5000;

// Query for:
// inactive <> pending
// active <> recovering
//
// Queries work without {timeFilter} but have this filter for performance reasons
export const DIRECTOR_PENDING_RECOVERING_QUERY = `FROM ${ALERT_EVENTS_INDEX}
  {timeFilter}
  | STATS
      last_status = LAST(status, @timestamp),
      last_event_timestamp = MAX(@timestamp)
        BY rule.id, alert_series_id
  | RENAME alert_series_id AS event_alert_series_id, last_event_timestamp AS event_last_event_timestamp
  | LOOKUP JOIN ${ALERT_TRANSITIONS_INDEX}
        ON rule.id == rule_id AND event_alert_series_id == alert_series_id
  | STATS
      last_tracked_state = COALESCE(LAST(end_state, @timestamp), "inactive"),
      last_episode_id = LAST(episode_id, @timestamp)
        BY rule.id, event_alert_series_id, last_status, event_last_event_timestamp
  | EVAL
      candidate_state =
        CASE(
          last_tracked_state == "inactive" AND last_status == "breach",
          "pending",
          last_tracked_state == "pending" AND last_status == "recover",
          "inactive",
          last_tracked_state == "active" AND last_status == "recover",
          "recovering",
          last_tracked_state == "recovering" AND last_status == "breach",
          "active",
          NULL)
  | WHERE candidate_state IS NOT NULL
  | RENAME rule.id AS rule_id, event_alert_series_id AS alert_series_id,
      last_episode_id AS episode_id, candidate_state AS end_state,
      last_tracked_state AS start_state, event_last_event_timestamp AS @timestamp
  | DROP last_status
  | LIMIT 10000`;

// Query for:
// pending -> active
// recoverig -> inactive
//
// TODO: Can't time filter on transitions, can be in a given state for a while
// Queries work without {timeFilter} but have this filter for performance reasons
export const DIRECTOR_ACTIVE_INACTIVE_QUERY = `FROM ${ALERT_TRANSITIONS_INDEX}
  {timeFilter}
  | STATS
      last_tracked_state = LAST(end_state, @timestamp),
      last_transition = MAX(last_event_timestamp)
        BY rule_id, alert_series_id, episode_id
  | WHERE last_tracked_state == "pending" OR last_tracked_state == "recovering"
  | RENAME alert_series_id AS transition_alert_series_id
  | LOOKUP JOIN ${ALERT_EVENTS_INDEX}
        ON rule.id == rule_id AND alert_series_id == transition_alert_series_id
  | WHERE @timestamp >= last_transition
  | STATS breached_event_count = COUNT(*) WHERE status == "breach", recover_event_count = COUNT(*) WHERE status == "recover", last_event_timestamp = MAX(@timestamp)
        BY rule.id, alert_series_id, last_tracked_state, episode_id
  | WHERE (breached_event_count > 0 AND last_tracked_state == "pending") OR (recover_event_count > 0 AND last_tracked_state == "recovering")
  | DROP breached_event_count, recover_event_count
  | EVAL
      candidate_state =
        CASE(last_tracked_state == "pending", "active",
          last_tracked_state == "recovering", "inactive", NULL)
  | WHERE candidate_state IS NOT NULL
  | RENAME last_event_timestamp AS @timestamp, candidate_state AS end_state,
      last_tracked_state AS start_state, rule.id AS rule_id
  | LIMIT 10000`;

export interface AlertDirectorOpts {
  esClient: ElasticsearchClient;
}

export function alertDirector({ esClient }: AlertDirectorOpts) {
  let lastStartForPendingAndRecoveringQuery: number;
  async function runDirectorForPendingAndRecoveringTransitions() {
    const queryLookback = lastStartForPendingAndRecoveringQuery
      ? `| WHERE @timestamp > "${new Date(
          lastStartForPendingAndRecoveringQuery - ADDITIONAL_LOOKBACK_MS
        ).toISOString()}"`
      : '';
    lastStartForPendingAndRecoveringQuery = Date.now();
    try {
      const result = await esClient.esql.query({
        query: DIRECTOR_PENDING_RECOVERING_QUERY.replace('{timeFilter}', queryLookback),
      });
      // eslint-disable-next-line no-console
      console.log(
        `${new Date().toISOString()} Director query for pending and recovering transitions took ${
          result.took
        }ms`
      );
      const columns = result.columns.map((col) => col.name);
      const results = result.values.map((val) => {
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < val.length; i++) {
          obj[columns[i]] = val[i];
        }
        return obj;
      });
      await createAlertTransitions(results, esClient);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`${new Date().toISOString()} Director failed: ${e.message}`);
    } finally {
      setTimeout(
        runDirectorForPendingAndRecoveringTransitions,
        Math.max(DIRECTOR_INTERVAL_MS - (Date.now() - lastStartForPendingAndRecoveringQuery), 0)
      );
    }
  }
  runDirectorForPendingAndRecoveringTransitions();

  let lastStartForActiveAndInactiveQuery: number;
  async function runDirectorForActiveAndInactiveTransitions() {
    const queryLookback = lastStartForActiveAndInactiveQuery
      ? `| WHERE @timestamp > "${new Date(
          lastStartForActiveAndInactiveQuery - ADDITIONAL_LOOKBACK_MS
        ).toISOString()}"`
      : '';
    lastStartForActiveAndInactiveQuery = Date.now();
    try {
      const result = await esClient.esql.query({
        query: DIRECTOR_ACTIVE_INACTIVE_QUERY.replace('{timeFilter}', queryLookback),
      });
      // eslint-disable-next-line no-console
      console.log(
        `${new Date().toISOString()} Director query for active and inactive transitions took ${
          result.took
        }ms`
      );
      const columns = result.columns.map((col) => col.name);
      const results = result.values.map((val) => {
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < val.length; i++) {
          obj[columns[i]] = val[i];
        }
        return obj;
      });
      await createAlertTransitions(results, esClient);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`${new Date().toISOString()} Director failed: ${e.message}`);
    } finally {
      setTimeout(
        runDirectorForActiveAndInactiveTransitions,
        Math.max(DIRECTOR_INTERVAL_MS - (Date.now() - lastStartForActiveAndInactiveQuery), 0)
      );
    }
  }
  runDirectorForActiveAndInactiveTransitions();
}

async function createAlertTransitions(
  rows: Record<string, unknown>[],
  esClient: ElasticsearchClient
) {
  if (rows.length === 0) return;
  const alertTransitions = rows.map((row) => {
    return {
      '@timestamp': new Date().toISOString(),
      rule_id: row.rule_id,
      alert_series_id: row.alert_series_id,
      // TODO: Find last episode..
      episode_id:
        row.start_state === 'inactive' && row.end_state === 'pending'
          ? v4()
          : row.episode_id || v4(),
      start_state: row.start_state,
      end_state: row.end_state,
      last_event_timestamp: row['@timestamp'],
    };
  });
  const bulkRequest = [];
  for (const alertTransition of alertTransitions) {
    bulkRequest.push({ create: {} });
    bulkRequest.push(alertTransition);
  }
  await esClient.bulk({
    index: ALERT_TRANSITIONS_INDEX,
    body: bulkRequest,
  });
  // eslint-disable-next-line no-console
  console.log(`${new Date().toISOString()} Indexed ${alertTransitions.length} transitions`);
}
