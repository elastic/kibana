/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createGcsRepository } from '@kbn/es-snapshot-loader';
import type { GcsConfig } from './snapshot_run_config';
import { resolveBasePath } from './snapshot_run_config';
import { LOGS_REPLAY_INDEX_MAPPINGS, LOGS_REPLAY_INDEX_SETTINGS } from './logs_index_template';
import type { ReplayStats } from './snapshot_replay_common';
import {
  REINDEX_REQUEST_TIMEOUT_MS,
  TIMESTAMP_TRANSFORM_SCRIPT,
  deleteIndicesByPrefix,
  getLogsIndicesFromSnapshot,
  summarizeReindexResult,
} from './snapshot_replay_common';

/**
 * Prefix for the isolated per-scenario replay indices used by KI query
 * generation. Kept outside the `logs*` space so the wired `logs` stream's
 * index templates never apply to (or collide with) these indices, which lets
 * scenarios be replayed side-by-side and queried concurrently.
 */
const QUERYGEN_REPLAY_INDEX_PREFIX = 'sigevents-qg-';

const RESTORE_TEMP_PREFIX = 'sigevents-qg-restore-';

/**
 * Sanitizes a scenario id into a valid, ES|QL-friendly index suffix
 * (lowercase alphanumerics and single hyphens).
 */
const sanitizeIndexSuffix = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'scenario';

/**
 * Builds the isolated replay index name for a scenario.
 */
export const queryGenReplayIndexName = (scenarioId: string): string =>
  `${QUERYGEN_REPLAY_INDEX_PREFIX}${sanitizeIndexSuffix(scenarioId)}`;

/**
 * Deletes all isolated per-scenario replay indices left behind by KI query
 * generation. The `${QUERYGEN_REPLAY_INDEX_PREFIX}*` pattern also matches the
 * transient `${RESTORE_TEMP_PREFIX}` restore indices.
 */
export const deleteQueryGenReplayIndices = (esClient: Client, log: ToolingLog): Promise<void> =>
  deleteIndicesByPrefix(esClient, log, QUERYGEN_REPLAY_INDEX_PREFIX);

/**
 * Replays a snapshot into a dedicated, isolated plain index so scenarios can be
 * queried side-by-side without sharing the singleton wired `logs` stream.
 *
 * Unlike {@link replayIntoManagedStream}, this targets a plain index, so the
 * timestamp transform can be applied directly as a reindex `dest.pipeline`
 * (data streams reject per-request pipelines; plain indices accept them). No
 * Streams enable/disable, write-index pipeline juggling, or shared state is
 * involved, which is what makes concurrent scenario execution safe.
 */
export async function replaySnapshotIntoIndex(
  esClient: Client,
  log: ToolingLog,
  snapshotName: string,
  gcs: GcsConfig,
  destIndex: string
): Promise<ReplayStats> {
  log.debug(`Replaying snapshot "${snapshotName}" into isolated index "${destIndex}"`);

  const basePath = resolveBasePath(gcs);
  const repository = createGcsRepository({ bucket: gcs.bucket, basePath });
  const runId = Date.now();
  const repoName = `sigevents-qg-replay-${runId}`;
  const pipelineName = `sigevents-qg-ts-transform-${runId}`;
  const tempPrefix = `${RESTORE_TEMP_PREFIX}${runId}-`;
  let tempIndices: string[] = [];

  try {
    repository.validate();
    await repository.register({ esClient, log, repoName });

    const logsIndices = await getLogsIndicesFromSnapshot({ esClient, repoName, snapshotName });

    await esClient.snapshot.restore({
      repository: repoName,
      snapshot: snapshotName,
      wait_for_completion: true,
      indices: logsIndices.join(','),
      include_global_state: false,
      rename_pattern: '(.+)',
      rename_replacement: `${tempPrefix}$1`,
      // Strip lifecycle so the cluster's ILM sweep doesn't reap the restored temp
      // index (its origination date is already past the delete age) mid-replay.
      ignore_index_settings: ['index.lifecycle.name', 'index.lifecycle.prefer_ilm'],
    });
    tempIndices = logsIndices.map((indexName) => `${tempPrefix}${indexName}`);

    const maxTsResult = await esClient.search({
      index: tempIndices.join(','),
      size: 0,
      aggs: { max_ts: { max: { field: '@timestamp' } } },
    });
    const maxTimestamp = (maxTsResult.aggregations?.max_ts as { value_as_string?: string })
      ?.value_as_string;
    if (!maxTimestamp) {
      throw new Error('No @timestamp found in restored snapshot indices');
    }

    await esClient.ingest.putPipeline({
      id: pipelineName,
      processors: [
        {
          script: {
            lang: 'painless',
            params: { max_timestamp: maxTimestamp, now_millis: Date.now() },
            source: TIMESTAMP_TRANSFORM_SCRIPT,
          },
        },
      ],
    });

    // Pre-create the destination with the same OTel Demo mapping workarounds the
    // managed `logs` data-stream template applies, so an isolated replay maps
    // fields identically to the production-parity managed-stream path (rather
    // than inheriting one arbitrary backing index's accumulated mappings).
    await esClient.indices.create({
      index: destIndex,
      settings: { index: { ...LOGS_REPLAY_INDEX_SETTINGS, number_of_replicas: 0 } },
      mappings: LOGS_REPLAY_INDEX_MAPPINGS,
    });

    const reindexResult = await esClient.reindex(
      {
        wait_for_completion: true,
        source: { index: tempIndices.join(',') },
        dest: { index: destIndex, op_type: 'create', pipeline: pipelineName },
      },
      { requestTimeout: REINDEX_REQUEST_TIMEOUT_MS }
    );

    const stats = summarizeReindexResult({ reindexResult, log });

    await esClient.indices.refresh({ index: destIndex });

    log.info(
      `Replay into "${destIndex}" complete: ${stats.created}/${stats.total} docs indexed, ${stats.skipped} skipped`
    );
    return stats;
  } finally {
    for (const indexName of tempIndices) {
      await esClient.indices
        .delete({ index: indexName, ignore_unavailable: true })
        .catch(() => log.warning(`Failed to delete temp index: ${indexName}`));
    }
    await esClient.ingest
      .deletePipeline({ id: pipelineName })
      .catch(() => log.warning('Failed to delete timestamp pipeline'));
    await esClient.snapshot
      .deleteRepository({ name: repoName })
      .catch(() => log.warning('Failed to delete snapshot repository'));
  }
}
