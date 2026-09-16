/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { extendToolingLog, SynthtraceClientsManager } from '@kbn/synthtrace';
import { infra } from '@kbn/synthtrace-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { Readable } from 'stream';
import { getDefaultTimeBounds } from '../evaluators/esql_bind_params';

export const HOST_METRICS_INDEX = 'metrics-system.load-default';
export const HOST_LOAD_DOC_COUNT = 75;
const HOST_NAME = 'viz-eval-host';

export function buildHostLoadEvents({
  now = Date.now(),
  count = HOST_LOAD_DOC_COUNT,
}: {
  now?: number;
  count?: number;
} = {}) {
  if (count < 1) {
    return [];
  }

  const { tstart } = getDefaultTimeBounds(now);
  const startMs = Date.parse(tstart);
  const stepMs = count === 1 ? 0 : (now - startMs) / (count - 1);

  return Array.from({ length: count }, (_, i) => {
    const systemLoad = {
      1: 0.8 + i * 0.01,
      5: 0.6 + i * 0.008,
      15: 0.4 + i * 0.006,
      cores: 8,
    };

    return infra
      .host(HOST_NAME)
      .load()
      .overrides({
        'system.load': systemLoad as { 1: number; cores: number },
      })
      .timestamp(startMs + stepMs * i);
  });
}

export async function assertHostLoadMetricsReady(esClient: Client): Promise<void> {
  const exists = await esClient.indices.exists({ index: HOST_METRICS_INDEX });
  if (!exists) {
    throw new Error(`Host load fixture missing: ${HOST_METRICS_INDEX} was not created`);
  }

  const { count } = await esClient.count({ index: HOST_METRICS_INDEX });
  if (count < 1) {
    throw new Error(`Host load fixture is empty: no documents in ${HOST_METRICS_INDEX}`);
  }
}

export async function seedHostLoadMetrics(esClient: Client, log: ToolingLog): Promise<void> {
  const logger = extendToolingLog(log);
  const { infraEsClient } = new SynthtraceClientsManager({
    client: esClient,
    logger,
    refreshAfterIndex: true,
  }).getClients({ clients: ['infraEsClient'] });

  await infraEsClient.index(Readable.from(buildHostLoadEvents()));
  await assertHostLoadMetricsReady(esClient);
  log.info(`Seeded ${HOST_METRICS_INDEX} with synthtrace host load metrics`);
}

export async function cleanHostLoadMetrics(esClient: Client, log?: ToolingLog): Promise<void> {
  try {
    await esClient.indices.deleteDataStream({ name: HOST_METRICS_INDEX });
  } catch (error) {
    log?.warning(`Failed to clean ${HOST_METRICS_INDEX}: ${(error as Error).message}`);
  }
}
