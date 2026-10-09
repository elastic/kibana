/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import {
  createGcsRepository,
  replaySnapshot,
  TEMP_INDEX_PREFIX,
  type LoadResult,
} from '@kbn/es-snapshot-loader';
import type { ToolingLog } from '@kbn/tooling-log';

export type { LoadResult };

// Reuses the shared obs-ai-datasets bucket — same vault path / CI credentials as
// kbn-evals-suite-observability-ai. No custom snapshot needed.
const GCS_BUCKET = 'obs-ai-datasets';
const GCS_BASE_PATH = 'otel-demo/payment-service-failures';
const SNAPSHOT_NAME = 'payment-service-failures';

async function deleteStaleTemporaryIndices(esClient: Client, log: ToolingLog): Promise<void> {
  let staleIndices: string[];
  try {
    const resolved = await esClient.indices.resolveIndex({ name: `${TEMP_INDEX_PREFIX}*` });
    staleIndices = resolved.indices.map((entry) => entry.name);
  } catch (error) {
    log.error(`Failed to resolve stale temporary indices: ${(error as Error).message}`);
    return;
  }

  if (staleIndices.length === 0) return;

  log.warning(`Found ${staleIndices.length} stale temporary indices from a previous run; deleting`);
  try {
    await esClient.indices.delete({ index: staleIndices.join(','), ignore_unavailable: true });
    log.info(`Deleted ${staleIndices.length} stale temporary indices`);
  } catch (error) {
    log.error(`Failed to delete stale temporary indices: ${(error as Error).message}`);
  }
}

export async function replayVisualizationDataStreams(
  esClient: Client,
  log: ToolingLog
): Promise<LoadResult> {
  await deleteStaleTemporaryIndices(esClient, log);

  const result = await replaySnapshot({
    esClient,
    log,
    repository: createGcsRepository({ bucket: GCS_BUCKET, basePath: GCS_BASE_PATH }),
    snapshotName: SNAPSHOT_NAME,
    patterns: ['logs-*', 'metrics-*', 'traces-*'],
  });

  if (!result.success) {
    await deleteStaleTemporaryIndices(esClient, log);
  }

  return result;
}

export async function cleanVisualizationDataStreams(
  esClient: Client,
  replayResult: LoadResult,
  log?: ToolingLog
): Promise<void> {
  const indices = [...new Set(replayResult?.reindexedIndices ?? [])];
  if (indices.length === 0) return;

  await Promise.all(
    indices.map(async (index) => {
      try {
        await esClient.deleteByQuery({ index, query: { match_all: {} }, refresh: true });
      } catch (error) {
        log?.warning(`deleteByQuery cleanup failed for [${index}]; documents may remain.`, error);
      }
    })
  );
}
