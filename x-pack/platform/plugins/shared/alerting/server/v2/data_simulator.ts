/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { v4 } from 'uuid';

export interface StartDataSimulatorOpts {
  esClient: ElasticsearchClient;
}

export const DATA_INTERVAL = 10000;
export const DATA_SIMULATOR_INDEX = '.kibana_simulator_logs';

export async function startDataSimulator({ esClient }: StartDataSimulatorOpts) {
  try {
    await esClient.indices.delete({ index: DATA_SIMULATOR_INDEX }, { ignore: [404] });
    await new Promise((resolve) => setTimeout(resolve, 100));
    await esClient.indices.create({
      index: DATA_SIMULATOR_INDEX,
      mappings: {
        dynamic: false,
        properties: {
          '@timestamp': { type: 'date' },
          message: { type: 'keyword' },
        },
      },
    });
  } catch (e) {
    console.error(`${new Date().toISOString()} Failed to setup indices: ${e.message}`);
  }

  setInterval(async () => {
    try {
      await esClient.index({
        index: DATA_SIMULATOR_INDEX,
        body: {
          '@timestamp': new Date().toISOString(),
          message: `Simulated message ${v4()}`,
        }
      });
    } catch (e) {
      console.error(`${new Date().toISOString()} Failed to write simulator data: ${e.message}`);
    }
  }, DATA_INTERVAL);
}
