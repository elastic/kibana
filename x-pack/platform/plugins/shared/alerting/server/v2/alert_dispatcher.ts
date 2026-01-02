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

export const INTERVAL = 1000;
export const DISPATCHER_EVENTS_QUERY = `FROM .kibana_alert_events
  | RENAME alert_series_id AS event_alert_series_id, @timestamp AS event_timestamp
  | LOOKUP JOIN .kibana_alert_actions
      ON
        rule.id == rule_id AND
          alert_series_id == event_alert_series_id AND
          action_type == "fire-event"
  | INLINE STATS last_fire = MAX(@timestamp)
        BY rule.id, event_alert_series_id
  | WHERE event_timestamp > last_fire OR last_fire IS NULL
  | KEEP event_timestamp, rule.id, event_alert_series_id
  | RENAME event_alert_series_id AS alert_series_id
  | STATS @timestamp = MAX(event_timestamp) BY rule.id, alert_series_id`;
export const DISPATCHER_ACTIONS_QUERY = `FROM .kibana_alert_actions
  | WHERE action_type != "fire-action" AND action_type != "fire-event"
  | RENAME alert_series_id AS action_alert_series_id, @timestamp AS action_timestamp,
      action_type AS action_action_type, rule_id AS action_rule_id
  | LOOKUP JOIN .kibana_alert_actions
        ON
          action_rule_id == rule_id AND
            action_alert_series_id == alert_series_id AND
            action_type == "fire-action"
  | INLINE STATS last_fire = MAX(@timestamp)
        BY action_rule_id, action_alert_series_id
  | WHERE action_timestamp > last_fire OR last_fire IS NULL
  | KEEP action_timestamp, action_rule_id, action_alert_series_id, action_action_type
  | RENAME action_alert_series_id AS alert_series_id, action_rule_id AS rule.id
  | STATS @timestamp = MAX(action_timestamp)
        BY rule.id, alert_series_id, action_action_type`;

export function alertDispatcher({ esClient }: AlertDispatcherOpts) {
  async function runDispatcherOnEventData() {
    const start = Date.now();
    try {
      await runAlertEventDispatcher({ esClient });
    } catch (e) {
      console.error(`${new Date().toISOString()} Dispatcher error: ${e.message}`);
    } finally {
      setTimeout(runDispatcherOnEventData, Math.max(INTERVAL - (Date.now() - start), 0));
    }
  }
  runDispatcherOnEventData();

  async function runDispatcherOnActionData() {
    const start = Date.now();
    try {
      await runAlertActionDispatcher({ esClient });
    } catch (e) {
      console.error(`${new Date().toISOString()} Dispatcher error: ${e.message}`);
    } finally {
      setTimeout(runDispatcherOnActionData, Math.max(INTERVAL - (Date.now() - start), 0));
    }
  }
  runDispatcherOnActionData();
}

async function runAlertEventDispatcher({ esClient }: AlertDispatcherOpts) {
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
  await dispatchAlertEvents(results, esClient);
}

async function runAlertActionDispatcher({ esClient }: AlertDispatcherOpts) {
  const result = await esClient.esql.query({
    query: DISPATCHER_ACTIONS_QUERY,
  });
  const columns = result.columns.map((col) => col.name);
  const results = result.values.map((val) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < val.length; i++) {
      obj[columns[i]] = val[i];
    }
    return obj;
  });
  await dispatchAlertActions(results, esClient);
}

async function dispatchAlertEvents(rows: Record<string, unknown>[], esClient: ElasticsearchClient) {
  if (rows.length === 0) return;
  const fireActions: Record<string, Record<string, Date>> = {};
  for (const row of rows) {
    const ruleId = row['rule.id'] as string;
    const timestamp = row['@timestamp'] as string;
    // console.log(`${new Date().toISOString()} Dispatching: ${JSON.stringify(row)}`);
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
        action_type: 'fire-event',
      });
    }
  }
  await esClient.bulk({
    index: ALERT_ACTIONS_INDEX,
    body: bulkRequest,
  });
  console.log(`${new Date().toISOString()} Dispatched ${rows.length} alert events`);
}

async function dispatchAlertActions(
  rows: Record<string, unknown>[],
  esClient: ElasticsearchClient
) {
  if (rows.length === 0) return;
  const fireActions: Record<string, Record<string, Date>> = {};
  for (const row of rows) {
    const ruleId = row['rule.id'] as string;
    const timestamp = row['@timestamp'] as string;
    // console.log(`${new Date().toISOString()} Dispatching: ${JSON.stringify(row)}`);
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
        action_type: 'fire-action',
      });
    }
  }
  await esClient.bulk({
    index: ALERT_ACTIONS_INDEX,
    body: bulkRequest,
  });
  console.log(`${new Date().toISOString()} Dispatched ${rows.length} alert actions`);
}
