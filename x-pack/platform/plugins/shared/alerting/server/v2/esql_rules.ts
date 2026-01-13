/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { pipeline } from 'node:stream/promises';

import { ALERT_EVENTS_INDEX } from './create_indices';
import { DATA_SIMULATOR_INDEX } from './data_simulator';
import { tsvToRowStream } from './lib/tsv_to_row_stream';
import { createRowSink } from './lib/create_row_sink';

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
      const result = await esClient.esql.query(queryOpts);
      // streamEsqlToConsole(esClient, queryOpts);
      const columns = result.columns.map((col) => col.name);
      const results = result.values.map((val) => {
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < val.length; i++) {
          obj[columns[i]] = val[i];
        }
        return obj;
      });
      await createAlertEvents(rule, results, esClient);
    } catch (e) {
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
  esClient: ElasticsearchClient
) {
  if (rows.length === 0) return;
  const now = new Date();
  const alertEvents = rows.map((row) => {
    return {
      '@timestamp': now,
      rule: {
        id: rule.id,
        tags: [],
        breach_count: rule.breachCount,
        recover_count: rule.recoverCount,
      },
      grouping: rule.groupingFields.map((field) => ({
        key: field,
        value: row[field],
      })),
      data: row,
      status: 'breach',
      // Can't have timestamp in here..
      alert_series_id: rule.groupingFields.map((field) => row[field]).join(':'),
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

async function streamEsqlToConsole(esClient: ElasticsearchClient, opts: any) {
  const result = await esClient.esql.query({ ...opts, format: 'tsv' }, { asStream: true });
  await pipeline(
    result,
    tsvToRowStream<Record<string, unknown>>(),
    createRowSink({
      async flush(rows) {
        console.log('FLUSH ROWS', rows);
      },
    })
  );
}
