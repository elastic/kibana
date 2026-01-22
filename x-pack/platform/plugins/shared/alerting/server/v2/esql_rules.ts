/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
// import { pipeline } from 'node:stream/promises';

import { ALERT_EVENTS_INDEX } from './create_indices';
import { DATA_SIMULATOR_INDEX } from './data_simulator';
// import { tsvToRowStream } from './lib/tsv_to_row_stream';
// import { createRowSink } from './lib/create_row_sink';

export interface ESQLRuleOpts {
  esClient: ElasticsearchClient;
}

export interface Rule {
  id: string;
  interval: number;
  query: string;
  lookbackWindow: string;
  groupingFields: string[];
  breachCount: number;
  recoverCount: number;
}

export const rules: Rule[] = [
  {
    id: '599df5ec-4821-4565-8ae7-64afc13561bd',
    interval: 1000,
    query: `FROM ${DATA_SIMULATOR_INDEX} METADATA _id, _index | WHERE message IS NOT NULL`,
    lookbackWindow: '5s',
    groupingFields: ['_id', '_index'],
    breachCount: 1,
    recoverCount: 1,
  },
  {
    id: 'ef9f2d76-e045-4c10-b133-8c3bd0e894d2',
    interval: 1000,
    query: `FROM ${DATA_SIMULATOR_INDEX} | WHERE message IS NULL | STATS avg_cpu = AVG(host.cpu.usage) BY host.name | WHERE avg_cpu > 0`,
    lookbackWindow: '5s',
    groupingFields: ['host.name'],
    breachCount: 1,
    recoverCount: 1,
  },
];

export function startEsqlRules({ esClient }: ESQLRuleOpts) {
  async function runEsqlRule(rule: Rule) {
    const start = Date.now();
    try {
      const queryOpts = {
        query: rule.query,
        filter: {
          range: {
            '@timestamp': {
              gte: `now-${rule.lookbackWindow}`,
            },
          },
        },
      };

      // Find latest alerts
      const result = await esClient.esql.query(queryOpts);
      const columns = result.columns.map((col) => col.name);
      const results = result.values.map((val) => {
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < val.length; i++) {
          obj[columns[i]] = val[i];
        }
        return obj;
      });

      const groupHashes = results.map((r) => {
        return rule.groupingFields.map((field) => r[field]).join(':');
      });

      // Find prev states
      const prevStateResult = await esClient.esql.query({
        query: `FROM ${ALERT_EVENTS_INDEX} | WHERE rule.id == "${
          rule.id
        }" AND group_hash IN ("${groupHashes.join(
          '", "'
        )}") | STATS last_status = LAST(status.value, @timestamp), status_count = LAST(status.count, @timestamp), last_episode = LAST(episode_id, @timestamp) BY group_hash`,
      });
      const columns2 = prevStateResult.columns.map((col) => col.name);
      const results2 = prevStateResult.values.map((val) => {
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < val.length; i++) {
          obj[columns2[i]] = val[i];
        }
        return obj;
      });
      const existingAlertByGroupHash: Record<string, unknown> = {};
      for (const alert of results2) {
        existingAlertByGroupHash[alert.group_hash] = alert;
      }

      for (const alert of results) {
        const prevAlert = existingAlertByGroupHash[alert.group_hash];
        if (!prevAlert) {
          alert.episode_id = v4();
          if (rule.breachCount > 1) {
            alert.status = { value: 'pending', count: 1 };
            continue;
          }
          alert.status = { value: 'active' };
          continue;
        }
        alert.episode_id = prevAlert.episode_id;
        switch (prevAlert.status.value) {
          case 'pending':
            if (prevAlert.status.count + 1 >= rule.breachCount) {
              alert.status = { value: 'active' };
              break;
            }
            alert.status = { value: 'pending', count: prevAlert.stats.count + 1 };
            break;
          case 'active':
            alert.status.count += 1;
            break;
          case 'recovering':
            alert.status = { value: 'active', count: 1 };
            break;
          case 'inactive':
            if (rule.breachCount > 1) {
              alert.status = { value: 'pending', count: 1 };
              alert.episode_id = v4();
              break;
            }
            alert.status = { value: 'active' };
            break;
        }
      }

      const alertStatusUpdates: Array<unknown> = [];
      for (const alert of results2) {
        const isStillExisting = groupHashes.includes(alert.group_hash);
        if (isStillExisting) {
          continue;
        }

        if (alert.status.value === 'pending') {
          alertStatusUpdates.push({
            group_hash: alert.group_hash,
            status: { value: 'inactive' },
            episode_id: alert.episode_id,
          });
        }

        if (alert.status.value === 'active' && rule.recoverCount > 1) {
          alertStatusUpdates.push({
            group_hash: alert.group_hash,
            status: { value: 'recovering', count: 1 },
            episode_id: alert.episode_id,
          });
        } else if (alert.status.value === 'active') {
          alertStatusUpdates.push({
            group_hash: alert.group_hash,
            status: { value: 'inactive' },
            episode_id: alert.episode_id,
          });
        }

        if (alert.status.value === 'recovering' && alert.status.count + 1 >= rule.recoverCount) {
          alertStatusUpdates.push({
            group_hash: alert.group_hash,
            status: { value: 'inactive' },
            episode_id: alert.episode_id,
          });
        } else {
          alertStatusUpdates.push({
            group_hash: alert.group_hash,
            status: { value: 'recovering', count: alert.status.count + 1 },
            episode_id: alert.episode_id,
          });
        }
      }

      await createAlertEvents(rule, results, esClient, alertStatusUpdates);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`${new Date().toISOString()} Failed to execute esql rule: ${e.message}`);
    } finally {
      setTimeout(() => runEsqlRule(rule), Math.max(rule.interval - (Date.now() - start), 0));
    }
  }
  for (const rule of rules) {
    runEsqlRule(rule);
  }
}

async function createAlertEvents(
  rule: Rule,
  rows: Record<string, unknown>[],
  esClient: ElasticsearchClient,
  alertStatusUpdates: unknown[]
) {
  if (rows.length === 0) return;
  const now = new Date();
  const alertEvents = rows.map((row) => {
    return {
      '@timestamp': now,
      scheduled_timestamp: now,
      rule: {
        id: rule.id,
        version: 1,
      },
      data: row,
      status: row.status,
      group_hash: rule.groupingFields.map((field) => row[field]).join(':'),
      source: 'internal',
    };
  });
  for (const update of alertStatusUpdates) {
    alertEvents.push({
      '@timestamp': now,
      scheduled_timestamp: now,
      rule: {
        id: rule.id,
        version: 1,
      },
      status: update.status,
      group_hash: update.group_hash,
      source: 'internal',
      episode_id: update.episode_id,
    });
  }
  const bulkRequest = [];
  for (const alertEvent of alertEvents) {
    bulkRequest.push({ create: {} });
    bulkRequest.push(alertEvent);
  }
  await esClient.bulk({
    index: ALERT_EVENTS_INDEX,
    body: bulkRequest,
  });
  // eslint-disable-next-line no-console
  console.log(`${new Date().toISOString()} Indexed ${alertEvents.length} alert events`);
}

// async function streamEsqlToConsole(esClient: ElasticsearchClient, opts: any) {
//   const result = await esClient.esql.query({ ...opts, format: 'tsv' }, { asStream: true });
//   await pipeline(
//     result,
//     tsvToRowStream<Record<string, unknown>>(),
//     createRowSink({
//       async flush(rows) {
//         console.log('FLUSH ROWS', rows);
//       },
//     })
//   );
// }
