/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_TRANSITIONS_INDEX } from './create_indices';

export const DIRECTOR_INTERVAL = 1000;

// Query for:
// inactive <> pending
// active <> recovering
export const DIRECTOR_PENDING_RECOVERING_QUERY = `FROM .kibana_alert_events
  | STATS
      last_status = LAST(status, @timestamp),
      last_event_timestamp = MAX(@timestamp)
        BY rule.id, alert_series_id
  | RENAME alert_series_id AS event_alert_series_id
  | LOOKUP JOIN .kibana_alert_transitions
        ON rule.id == rule_id AND event_alert_series_id == alert_series_id
  | STATS
      last_tracked_state = COALESCE(LAST(end_state, @timestamp), "inactive"),
      last_episode_id = LAST(episode_id, @timestamp)
        BY rule.id, event_alert_series_id, last_status, last_event_timestamp
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
      last_tracked_state AS start_state, last_event_timestamp AS @timestamp
  | DROP last_status`;

// Query for:
// pending -> active
// recoverig -> inactive
export const DIRECTORY_ACTIVE_INACTIVE_QUERY = `FROM .kibana_alert_transitions
  | STATS
      last_tracked_state = LAST(end_state, @timestamp),
      last_transition = MAX(@timestamp)
        BY rule_id, alert_series_id, episode_id
  | WHERE last_tracked_state == "pending" OR last_tracked_state == "recovering"
  | RENAME alert_series_id AS transition_alert_series_id
  | LOOKUP JOIN .kibana_alert_events
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
      last_tracked_state AS start_state, rule.id AS rule_id`;

export interface AlertDirectorOpts {
  esClient: ElasticsearchClient;
}

export function alertDirector({ esClient }: AlertDirectorOpts) {
  async function runDirectorForPendingAndRecoveringTransitions() {
    const start = Date.now();
    try {
      const result = await esClient.esql.query({
        query: DIRECTOR_PENDING_RECOVERING_QUERY,
      });
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
      console.error(`${new Date().toISOString()} Director failed: ${e.message}`);
    } finally {
      setTimeout(
        runDirectorForPendingAndRecoveringTransitions,
        Math.max(DIRECTOR_INTERVAL - (Date.now() - start), 0)
      );
    }
  }
  runDirectorForPendingAndRecoveringTransitions();

  async function runDirectorForActiveAndInactiveTransitions() {
    const start = Date.now();
    try {
      const result = await esClient.esql.query({
        query: DIRECTORY_ACTIVE_INACTIVE_QUERY,
      });
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
      console.error(`${new Date().toISOString()} Director failed: ${e.message}`);
    } finally {
      setTimeout(
        runDirectorForActiveAndInactiveTransitions,
        Math.max(DIRECTOR_INTERVAL - (Date.now() - start), 0)
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
      '@timestamp': row['@timestamp'],
      rule_id: row.rule_id,
      alert_series_id: row.alert_series_id,
      // TODO: Find last episode..
      episode_id:
        row.start_state === 'inactive' && row.end_state === 'pending'
          ? v4()
          : row.episode_id || v4(),
      start_state: row.start_state,
      end_state: row.end_state,
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
  console.log(`${new Date().toISOString()} Indexed ${alertTransitions.length} transitions`);
}
