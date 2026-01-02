/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { ALERT_EVENTS_INDEX } from './create_indices';
import { DATA_SIMULATOR_INDEX } from './data_simulator';

export interface ESQLRuleOpts {
  esClient: ElasticsearchClient;
}

export const RULE_UUID = '599df5ec-4821-4565-8ae7-64afc13561bd';
export const RULE_INTERVAL = 1000;
export const ESQL_QUERY = `FROM ${DATA_SIMULATOR_INDEX} METADATA _id, _index`;
export const RULE_LOOKBACK = '5m';

export function esqlRule({ esClient }: ESQLRuleOpts) {
  async function runEsqlRule() {
    const start = Date.now();
    try {
      const result = await esClient.esql.query({
        query: ESQL_QUERY,
        filter: {
          range: {
            '@timestamp': {
              gte: `now-${RULE_LOOKBACK}`,
            },
          },
        },
      });
      const columns = result.columns.map((col) => col.name);
      const results = result.values.map((val) => {
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < val.length; i++) {
          obj[columns[i]] = val[i];
        }
        return obj;
      });
      await createAlertEvents(results, esClient);
    } catch (e) {
      console.error(`${new Date().toISOString()} Failed to execute esql rule: ${e.message}`);
    } finally {
      setTimeout(runEsqlRule, Math.max(RULE_INTERVAL - (Date.now() - start), 0));
    }
  }
  runEsqlRule();
}

async function createAlertEvents(rows: Record<string, unknown>[], esClient: ElasticsearchClient) {
  if (rows.length === 0) return;
  const now = new Date();
  const alertEvents = rows.map((row) => {
    return {
      '@timestamp': now,
      rule: {
        id: RULE_UUID,
        tags: [],
      },
      grouping: [
        {
          key: '_id',
          value: row._id,
        },
        {
          key: '_index',
          value: row._index,
        },
      ],
      data: row,
      status: 'breach',
      // Can't have timestamp in here..
      alert_series_id: `${row._id}:${row._index}`,
      source: 'rule',
    };
  });
  const bulkRequest = [];
  for (const alertEvent of alertEvents) {
    bulkRequest.push({ create: {} });
    bulkRequest.push(alertEvent);
  }
  await esClient.bulk({
    index: ALERT_EVENTS_INDEX,
    body: bulkRequest,
  });
  console.log(`${new Date().toISOString()} Indexed ${alertEvents.length} alert events`);
}
