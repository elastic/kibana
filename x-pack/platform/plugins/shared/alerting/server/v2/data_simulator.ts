/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { v4 } from 'uuid';

export interface DataSimulatorOpts {
  esClient: ElasticsearchClient;
}

export const INTERVAL = 10000;
export const NUM_HOSTS_LOGS_PER_INTERVAL = 1;
export const NUM_HOSTS_METRICS_PER_INTERVAL = 1;
export const DATA_SIMULATOR_INDEX = '.kibana_simulator_data';

export async function startDataSimulator({ esClient }: DataSimulatorOpts) {
  try {
    await createIndex({ esClient });
  } catch (e) {
    console.error(`${new Date().toISOString()} Failed to setup data simulator index: ${e.message}`);
  }

  setInterval(async () => {
    try {
      await indexSimulatedData({ esClient });
    } catch (e) {
      console.error(`${new Date().toISOString()} Failed to write simulator data: ${e.message}`);
    }
  }, INTERVAL);
}

async function createIndex({ esClient }: DataSimulatorOpts) {
  await esClient.indices.delete({ index: DATA_SIMULATOR_INDEX }, { ignore: [404] });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await esClient.indices.create({
    index: DATA_SIMULATOR_INDEX,
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': { type: 'date' },
        message: { type: 'keyword' },
        host: {
          properties: {
            name: { type: 'keyword' },
            cpu: {
              properties: {
                usage: { type: 'double' },
              },
            },
          },
        },
      },
    },
  });
}

async function indexSimulatedData({ esClient }: DataSimulatorOpts) {
  const rows = [];
  for (let i = 0; i < NUM_HOSTS_LOGS_PER_INTERVAL; i++) {
    rows.push({
      '@timestamp': new Date().toISOString(),
      message: `Some message ${v4()}`,
      host: {
        name: `host-${i + 1}`,
      },
    });
  }
  for (let i = 0; i < NUM_HOSTS_METRICS_PER_INTERVAL; i++) {
    rows.push({
      '@timestamp': new Date().toISOString(),
      host: {
        name: `host-${i + 1}`,
        cpu: {
          usage: Math.random(),
        },
      },
    });
  }
  const bulkRequest = [];
  for (const row of rows) {
    bulkRequest.push({ create: {} });
    bulkRequest.push(row);
  }
  await esClient.bulk({
    index: DATA_SIMULATOR_INDEX,
    body: bulkRequest,
  });
  console.log(`${new Date().toISOString()} Wrote ${rows.length} source documents`);
}
