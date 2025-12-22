/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_EVENTS_INDEX, ALERT_TRANSITIONS_INDEX } from './create_indices';

export const DIRECTOR_INTERVAL = 1000;
export const DIRECTOR_ESQL_QUERY = `FROM ${ALERT_EVENTS_INDEX}
| STATS last_status = LAST(status, @timestamp)
    BY rule.id, alert_series_id
| RENAME alert_series_id AS event_alert_series_id
| LOOKUP JOIN .kibana_alert_transitions
    ON rule.id == rule_id AND event_alert_series_id == alert_series_id
| STATS
    last_tracked_state = COALESCE(LAST(end_state, @timestamp), "inactive"),
    last_episode_id    = LAST(episode_id, @timestamp)
    BY rule.id, event_alert_series_id, last_status
| EVAL candidate_state = CASE(
    last_tracked_state == "inactive"     AND last_status == "breach",    "pending",
    last_tracked_state == "pending"      AND last_status == "recover",   "inactive",
    last_tracked_state == "active"       AND last_status == "recover",   "recovering",
    last_tracked_state == "recovering"   AND last_status == "breach",    "active",
    NULL
  )
| WHERE candidate_state IS NOT NULL`;

export interface CreateIndicesOpts {
  esClient: ElasticsearchClient;
}

export function alertDirector({ esClient }: CreateIndicesOpts) {
  setInterval(async () => {
    try {
      const result = await esClient.esql.query({
        query: DIRECTOR_ESQL_QUERY,
      });
      const columns = result.columns.map((col) => col.name);
      const results = result.values.map((val) => {
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < val.length; i++) {
          obj[columns[i]] = val[i];
        }
        return obj;
      });
      createAlertTransitions(results, esClient);
    } catch (e) {
      console.error(`Director failed: ${e.message}`);
    }
  }, DIRECTOR_INTERVAL);
}

async function createAlertTransitions(
  rows: Record<string, unknown>[],
  esClient: ElasticsearchClient
) {
  if (rows.length === 0) return;
  try {
    const now = new Date();
    const alertTransitions = rows.map((row) => {
      return {
        '@timestamp': now,
        rule_id: row['rule.id'],
        alert_series_id: row['alert_event.alert_series_id'],
        // TODO: Find last episode..
        episode_id:
          row.last_tracked_state === 'inactive' && row.candidate_state === 'pending'
            ? v4()
            : row.last_episode_id || v4(),
        start_state: row.last_tracked_state,
        end_state: row.candidate_state,
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
    console.log(`Indexed ${alertTransitions.length} transitions`);
  } catch (e) {
    console.error(`Failed to index transitions: ${e.message}`);
  }
}
