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
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { getDefaultTimeBounds } from '../evaluators/esql_bind_params';

export const HOST_METRICS_INDEX = 'metrics-system.load-default';
export const HOST_LOAD_DOC_COUNT = 75;
export const HOST_NAME = 'viz-eval-host';

export function buildHostLoadEvents({
  now = Date.now(),
  count = HOST_LOAD_DOC_COUNT,
  runId,
}: {
  now?: number;
  count?: number;
  /** Written to `agent.id` so cleanup can target exactly this run's documents. */
  runId?: string;
} = {}) {
  if (count < 1) {
    return [];
  }

  const { tstart } = getDefaultTimeBounds(now);
  const startMs = Date.parse(tstart);
  const stepMs = count === 1 ? 0 : (now - startMs) / (count - 1);

  return Array.from({ length: count }, (_, i) => {
    const systemLoad: BeatsSystemLoad = {
      1: 0.8 + i * 0.01,
      5: 0.6 + i * 0.008,
      15: 0.4 + i * 0.006,
      cores: 8,
    };

    return (
      infra
        .host(HOST_NAME)
        .load()
        // Structural widening only: synthtrace types just the 1-minute average, and the
        // extra 5 / 15 averages are serialized as-is (asserted by seed_contract.test.ts).
        .overrides({
          'system.load': systemLoad as { 1: number; cores: number },
          ...(runId ? { 'agent.id': runId } : {}),
        })
        .timestamp(startMs + stepMs * i)
    );
  });
}

/** The Beats `load` metricset fields the gold queries aggregate. */
interface BeatsSystemLoad {
  1: number;
  5: number;
  15: number;
  cores: number;
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

/** What the fixture owns, so cleanup never removes data it did not write. */
export interface HostLoadFixture {
  /** Per-run `agent.id` on every seeded document. */
  runId: string;
}

export async function seedHostLoadMetrics(
  esClient: Client,
  log: ToolingLog
): Promise<HostLoadFixture> {
  // An empty stream left by an earlier run's cleanup holds nothing to skew the averages.
  const existed = await esClient.indices.exists({ index: HOST_METRICS_INDEX });
  const { count: existingCount } = existed
    ? await esClient.count({ index: HOST_METRICS_INDEX })
    : { count: 0 };
  if (existingCount > 0) {
    log.warning(
      `${HOST_METRICS_INDEX} already exists; seeding ${HOST_NAME} documents alongside its data. ` +
        'Load averages in the eval window will include the pre-existing documents.'
    );
  }

  const logger = extendToolingLog(log);
  const { infraEsClient } = new SynthtraceClientsManager({
    client: esClient,
    logger,
    refreshAfterIndex: true,
  }).getClients({ clients: ['infraEsClient'] });

  const fixture: HostLoadFixture = {
    runId: `viz-eval-${randomUUID()}`,
  };
  try {
    await infraEsClient.index(Readable.from(buildHostLoadEvents({ runId: fixture.runId })));
    await assertHostLoadMetricsReady(esClient);
  } catch (error) {
    // The caller never receives the fixture on failure, so undo a partial seed here.
    await cleanHostLoadMetrics(esClient, fixture, log);
    throw error;
  }
  log.info(`Seeded ${HOST_METRICS_INDEX} with synthtrace host load metrics`);

  return fixture;
}

/**
 * Deletes only the documents this run seeded. The data stream is kept, even when
 * empty: a concurrent run or Metricbeat can write to it at any moment, and no
 * delete can be made conditional on it staying empty.
 */
export async function cleanHostLoadMetrics(
  esClient: Client,
  fixture: HostLoadFixture,
  log?: ToolingLog
): Promise<void> {
  try {
    await esClient.deleteByQuery({
      index: HOST_METRICS_INDEX,
      query: {
        bool: {
          filter: [{ term: { 'host.name': HOST_NAME } }, { term: { 'agent.id': fixture.runId } }],
        },
      },
      refresh: true,
    });
  } catch (error) {
    log?.warning(`Failed to clean ${HOST_METRICS_INDEX}: ${(error as Error).message}`);
  }
}
