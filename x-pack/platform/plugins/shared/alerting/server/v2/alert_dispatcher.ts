/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_ACTIONS_INDEX } from './create_indices';

export interface AlertDispatcherOpts {
  esClient: ElasticsearchClient;
}

export const DISPATCHER_EVENTS_QUERY = `FROM .kibana_alert_events
  | RENAME alert_series_id AS event_alert_series_id
  | RENAME @timestamp AS event_timestamp
  | LOOKUP JOIN .kibana_alert_actions
        ON
          rule.id == rule_id AND
            alert_series_id == event_alert_series_id AND
            action_type == "fire"
  | STATS last_fire = MAX(@timestamp)
        BY rule.id, event_alert_series_id
  | RENAME rule.id AS event_rule_id
  | LOOKUP JOIN .kibana_alert_events
        ON rule.id == event_rule_id AND alert_series_id == event_alert_series_id
  | WHERE @timestamp > last_fire OR last_fire IS NULL`;
export const INTERVAL = 1000;

export function alertDispatcher({ esClient }: AlertDispatcherOpts) {
  setInterval(async () => {
    try {
      const result = await esClient.esql.query({
        query: DISPATCHER_EVENTS_QUERY,
      });
      const columns = result.columns.map((col) => col.name);
      const results = result.values.map((val) => {
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < val.length; i++) {
          obj[columns[i]] = val[i];
        }
        return obj;
      });
      dispatchEvents(results, esClient);
    } catch (e) {
      console.error(`Dispatcher error: ${e.message}`);
    }
  }, INTERVAL);
}

async function dispatchEvents(rows: Record<string, unknown>[], esClient: ElasticsearchClient) {
  if (rows.length === 0) return;
  try {
    const fireActions: Record<string, Record<string, Date>> = {};
    for (const row of rows) {
      const ruleId = row['rule.id'] as string;
      const timestamp = row['@timestamp'] as string;
      // console.log(`Dispatching: ${JSON.stringify(row)}`);
      if (fireActions[ruleId] === undefined) {
        fireActions[ruleId] = [];
      }
      if (
        fireActions[ruleId][row.alert_series_id] === undefined ||
        fireActions[ruleId][row.alert_series_id] < new Date(timestamp)
      ) {
        fireActions[ruleId][row.alert_series_id] = new Date(timestamp);
      }
    }
    const bulkRequest = [];
    for (const ruleId of Object.keys(fireActions)) {
      for (const alertSeriesId of Object.keys(fireActions[ruleId])) {
        bulkRequest.push({ index: {} });
        bulkRequest.push({
          '@timestamp': fireActions[ruleId][alertSeriesId].toISOString(),
          rule_id: ruleId,
          alert_series_id: alertSeriesId,
          action_type: 'fire',
        });
      }
    }
    await esClient.bulk({
      index: ALERT_ACTIONS_INDEX,
      body: bulkRequest,
    });
    console.log(`Dispatched ${rows.length} events`);
  } catch (e) {
    console.error(`Failed to dispatch: ${e.message}`);
  }
}
