/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_EVENTS_INDEX, ALERT_ACTIONS_INDEX } from './create_indices';

export interface AlertDispatcherOpts {
  esClient: ElasticsearchClient;
}

export const DISPATCHER_INTERVAL_MS = 1000;
export const ADDITIONAL_LOOKBACK_MS = 5000;

// Query for:
//  - alert events that have been reported since the last time the dispatcher fired them
export const DISPATCHER_EVENTS_QUERY = `FROM ${ALERT_EVENTS_INDEX}
  {timeFilter}
  | RENAME group_hash AS event_group_hash, @timestamp AS event_timestamp
  | LOOKUP JOIN ${ALERT_ACTIONS_INDEX}
      ON
        rule.id == rule_id AND
          group_hash == event_group_hash AND
          action_type == "fire-event"
  | STATS last_fire = MAX(max_source_timestmap), max_event_timestamp = MAX(event_timestamp)
        BY rule.id, event_group_hash
  | WHERE last_fire IS NULL OR max_event_timestamp > last_fire
  | LIMIT 10000`;

// Query for:
//  - alert actions that have been created since the last time the dispatcher fired them
export const DISPATCHER_ACTIONS_QUERY = `FROM ${ALERT_ACTIONS_INDEX}
  {timeFilter}
  | WHERE action_type != "fire-action" AND action_type != "fire-event"
  | RENAME group_hash AS action_group_hash, @timestamp AS action_timestamp,
      action_type AS action_action_type, rule_id AS action_rule_id
  | LOOKUP JOIN ${ALERT_ACTIONS_INDEX}
        ON
          action_rule_id == rule_id AND
            action_group_hash == group_hash AND
            action_type == "fire-action"
  | STATS last_fire = MAX(max_source_timestmap), max_action_timestamp = MAX(action_timestamp)
        BY action_rule_id, action_group_hash
  | WHERE last_fire IS NULL OR max_action_timestamp > last_fire
  | LIMIT 10000`;

export function alertDispatcher({ esClient }: AlertDispatcherOpts) {
  let lastStartForEventDataDispatcher: number;
  async function runDispatcherOnEventData() {
    const queryLookback = lastStartForEventDataDispatcher
      ? `| WHERE @timestamp > "${new Date(
          lastStartForEventDataDispatcher - ADDITIONAL_LOOKBACK_MS
        ).toISOString()}"`
      : '';
    lastStartForEventDataDispatcher = Date.now();
    try {
      await runAlertEventDispatcher({ esClient, queryLookback });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`${new Date().toISOString()} Dispatcher error: ${e.message}`);
    } finally {
      setTimeout(
        runDispatcherOnEventData,
        Math.max(DISPATCHER_INTERVAL_MS - (Date.now() - lastStartForEventDataDispatcher), 0)
      );
    }
  }
  runDispatcherOnEventData();

  let lastStartForActionDataDispatcher: number;
  async function runDispatcherOnActionData() {
    const queryLookback = lastStartForActionDataDispatcher
      ? `| WHERE @timestamp > "${new Date(
          lastStartForActionDataDispatcher - ADDITIONAL_LOOKBACK_MS
        ).toISOString()}"`
      : '';
    lastStartForActionDataDispatcher = Date.now();
    try {
      await runAlertActionDispatcher({ esClient, queryLookback });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`${new Date().toISOString()} Dispatcher error: ${e.message}`);
    } finally {
      setTimeout(
        runDispatcherOnActionData,
        Math.max(DISPATCHER_INTERVAL_MS - (Date.now() - lastStartForActionDataDispatcher), 0)
      );
    }
  }
  runDispatcherOnActionData();
}

async function runAlertEventDispatcher({
  esClient,
  queryLookback,
}: {
  esClient: ElasticsearchClient;
  queryLookback: string;
}) {
  const result = await esClient.esql.query({
    query: DISPATCHER_EVENTS_QUERY.replace('{timeFilter}', queryLookback),
  });
  // eslint-disable-next-line no-console
  console.log(
    `${new Date().toISOString()} Dispatcher query for alert events took ${result.took}ms`
  );
  const columns = result.columns.map((col) => col.name);
  const results = result.values.map((val) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < val.length; i++) {
      obj[columns[i]] = val[i];
    }
    return obj;
  });
  await dispatchEventsAndActions(results, esClient, 'event');
}

async function runAlertActionDispatcher({
  esClient,
  queryLookback,
}: {
  esClient: ElasticsearchClient;
  queryLookback: string;
}) {
  const result = await esClient.esql.query({
    query: DISPATCHER_ACTIONS_QUERY.replace('{timeFilter}', queryLookback),
  });
  // eslint-disable-next-line no-console
  console.log(
    `${new Date().toISOString()} Dispatcher query for alert actions took ${result.took}ms`
  );
  const columns = result.columns.map((col) => col.name);
  const results = result.values.map((val) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < val.length; i++) {
      obj[columns[i]] = val[i];
    }
    return obj;
  });
  await dispatchEventsAndActions(results, esClient, 'action');
}

async function dispatchEventsAndActions(
  rows: Record<string, unknown>[],
  esClient: ElasticsearchClient,
  source: 'event' | 'action'
) {
  if (rows.length === 0) return;
  const bulkRequest = [];
  const now = new Date().toISOString();
  for (const row of rows) {
    bulkRequest.push({ index: {} });
    bulkRequest.push({
      '@timestamp': now,
      rule_id: row['rule.id'],
      group_hash: row.event_group_hash,
      action_type: `fire-${source}`,
      max_source_timestamp: row[`max_${source}_timestamp`],
    });
  }
  await esClient.bulk({
    index: ALERT_ACTIONS_INDEX,
    body: bulkRequest,
  });
  // eslint-disable-next-line no-console
  console.log(`${new Date().toISOString()} Dispatched ${rows.length} alert ${source}s`);
}
