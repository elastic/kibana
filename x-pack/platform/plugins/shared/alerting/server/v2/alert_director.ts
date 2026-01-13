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

export const DIRECTOR_QUERY = `FROM .kibana_alert_events, .kibana_alert_transitions
    METADATA _index
  {timeFilter}
  | EVAL rule_id = COALESCE(rule.id, rule_id)
  | INLINE STATS
      last_transition_event_timestamp = MAX(last_event_timestamp) WHERE
        _index == ".kibana_alert_transitions",
      last_breach_timestamp = MAX(@timestamp) WHERE
        _index == ".kibana_alert_events" AND status == "breach",
      last_recover_timestamp = MAX(@timestamp) WHERE
        _index == ".kibana_alert_events" AND status == "recover"
        BY rule_id, alert_series_id
  | STATS
      last_tracked_state = COALESCE(LAST(end_state, @timestamp), "inactive"),
      last_event_timestamp = MAX(@timestamp) WHERE
        _index == ".kibana_alert_events",
      last_transition = MAX(@timestamp) WHERE
        _index == ".kibana_alert_transitions",
      episode_id = LAST(episode_id, @timestamp),
      last_status = LAST(status, @timestamp),
      breach_count = COUNT(*) WHERE
        status == "breach" AND
          @timestamp >= last_transition_event_timestamp AND
          (@timestamp > last_recover_timestamp OR last_recover_timestamp IS NULL),
      recover_count = COUNT(*) WHERE
        status == "recover" AND
          @timestamp >= last_transition_event_timestamp AND
          (@timestamp > last_breach_timestamp OR last_breach_timestamp IS NULL),
      breach_count_threshold = LAST(rule.breach_count, @timestamp),
      recover_count_threshold = LAST(rule.recover_count, @timestamp)
        BY rule_id, alert_series_id
  | EVAL
      next_state =
        CASE(
          last_tracked_state == "inactive" AND last_status == "breach",
          "pending",
          last_tracked_state == "pending" AND last_status == "recover",
          "inactive",
          last_tracked_state == "active" AND last_status == "recover",
          "recovering",
          last_tracked_state == "recovering" AND last_status == "breach",
          "active",
          last_tracked_state == "pending" AND
            breach_count >= breach_count_threshold,
          "active",
          last_tracked_state == "recovering" AND
            recover_count >= recover_count_threshold,
          "inactive",
          NULL)
  | WHERE next_state IS NOT NULL
  | RENAME next_state AS end_state, last_tracked_state AS start_state
  | DROP last_status, last_transition
  | LIMIT 10000`;

export interface AlertDirectorOpts {
  esClient: ElasticsearchClient;
}

export function alertDirector({ esClient }: AlertDirectorOpts) {
  let lastQueryStart: number;
  async function runDirector() {
    const queryLookback = lastQueryStart
      ? `| WHERE _index != ".kibana_alert_events" OR @timestamp > "${new Date(
          lastQueryStart - ADDITIONAL_LOOKBACK_MS
        ).toISOString()}"`
      : '';
    lastQueryStart = Date.now();
    try {
      const result = await esClient.esql.query({
        query: DIRECTOR_QUERY.replace('{timeFilter}', queryLookback),
      });
      // eslint-disable-next-line no-console
      console.log(`${new Date().toISOString()} Director query took ${result.took}ms`);
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
      setTimeout(runDirector, Math.max(DIRECTOR_INTERVAL_MS - (Date.now() - lastQueryStart), 0));
    }
  }
  runDirector();
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
      last_event_timestamp: row.last_event_timestamp,
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
