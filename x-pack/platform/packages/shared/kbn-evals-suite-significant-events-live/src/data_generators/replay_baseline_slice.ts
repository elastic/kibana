/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createGcsRepository } from '@kbn/es-snapshot-loader';
import type { GcsConfig, ReplayStats } from '@kbn/evals-suite-significant-events';
import {
  createReplayPipeline,
  deleteTemporaryReplayIndices,
  getLogsIndicesFromSnapshot,
  getMaxTimestampFromTempIndices,
  getReplayChainPipeline,
  getWriteIndexInfo,
  replayTempPrefix,
  resolveBasePath,
  restoreLogsIndicesToTemp,
  setWriteIndexDefaultPipeline,
} from '@kbn/evals-suite-significant-events';

const LOGS_STREAM_NAME = 'logs';
const REINDEX_REQUEST_TIMEOUT_MS = 30 * 60 * 1000;

export interface BaselineSliceReplayResult {
  stats: ReplayStats;
  /**
   * Restored temp indices holding the FULL snapshot (baseline + tail). Kept alive on purpose —
   * `streamIncidentTail` reads the tail from them and deletes them when streaming finishes.
   */
  tempIndices: string[];
  /** Source-timeline timestamp (epoch ms) where the incident tail begins. */
  cutTimestampMs: number;
  /** Source-timeline max `@timestamp` (epoch ms) across the snapshot's logs. */
  snapshotMaxTimestampMs: number;
}

/**
 * Replay only the pre-incident baseline of a snapshot into the managed `logs` stream, shifted so
 * the newest baseline doc lands at ~now. The incident tail (docs at/after the cut) is NOT
 * indexed here — it stays in the temp indices for `streamIncidentTail` to write progressively
 * while real alerting rules run.
 *
 * After the baseline reindex the write index's `default_pipeline` is restored to its previous
 * value, so streamed tail docs go through the normal stream processing instead of the
 * timestamp-shift pipeline.
 */
export async function replayBaselineSliceIntoManagedStream(
  esClient: Client,
  log: ToolingLog,
  snapshotName: string,
  gcs: GcsConfig,
  { incidentOnsetOffsetMinutes }: { incidentOnsetOffsetMinutes: number }
): Promise<BaselineSliceReplayResult> {
  log.debug(
    `Replaying baseline slice of snapshot "${snapshotName}" (incident onset ${incidentOnsetOffsetMinutes}m before snapshot end)`
  );

  const basePath = resolveBasePath(gcs);
  const repository = createGcsRepository({ bucket: gcs.bucket, basePath });
  const runId = Date.now();
  const tempPrefix = replayTempPrefix(runId);
  const repoName = `sigevents-replay-${runId}`;
  const pipelineName = `sigevents-ts-transform-${runId}`;

  let tempIndices: string[] = [];
  let writeIndexName: string | undefined;
  let previousDefaultPipeline = '_none';

  try {
    log.info('Step 1/5: Registering snapshot repository...');
    repository.validate();
    await repository.register({ esClient, log, repoName });

    log.info('Step 2/5: Restoring logs snapshot indices into temporary indices...');
    await deleteTemporaryReplayIndices(esClient, log);
    const logsIndices = await getLogsIndicesFromSnapshot({ esClient, repoName, snapshotName });
    tempIndices = await restoreLogsIndicesToTemp({
      esClient,
      repoName,
      snapshotName,
      logsIndices,
      tempPrefix,
      log,
    });
    await esClient.indices
      .putSettings({ index: tempIndices, settings: { 'index.default_pipeline': '_none' } })
      .catch(() => log.warning('Failed to clear default_pipeline on temp indices'));

    log.info('Step 3/5: Computing the incident onset cut...');
    const maxTimestampIso = await getMaxTimestampFromTempIndices({ esClient, tempIndices, log });
    const snapshotMaxTimestampMs = new Date(maxTimestampIso).getTime();
    const cutTimestampMs = snapshotMaxTimestampMs - incidentOnsetOffsetMinutes * 60_000;
    const cutIso = new Date(cutTimestampMs).toISOString();
    log.info(`Snapshot ends at ${maxTimestampIso}; baseline/tail cut at ${cutIso}`);

    // Guard against a degenerate split: captured snapshots are short (often 10-20 minutes), so
    // an oversized offset silently produces a near-empty baseline — onboarding then generates
    // queries from almost no data and everything downstream is meaningless.
    const countsResponse = await esClient.search({
      index: tempIndices.join(','),
      size: 0,
      track_total_hits: true,
      aggs: {
        min_ts: { min: { field: '@timestamp' } },
        baseline_docs: { filter: { range: { '@timestamp': { lt: cutIso } } } },
      },
    });
    const totalDocs =
      typeof countsResponse.hits.total === 'number'
        ? countsResponse.hits.total
        : countsResponse.hits.total?.value ?? 0;
    const baselineDocs =
      (countsResponse.aggregations?.baseline_docs as { doc_count?: number })?.doc_count ?? 0;
    const minTsMs = (countsResponse.aggregations?.min_ts as { value?: number | null })?.value;
    const spanMinutes =
      minTsMs != null ? Math.round((snapshotMaxTimestampMs - minTsMs) / 60_000) : undefined;
    log.info(
      `Snapshot spans ~${spanMinutes ?? '?'} minute(s), ${totalDocs} doc(s); ` +
        `${baselineDocs} doc(s) fall before the cut`
    );
    if (totalDocs > 0 && baselineDocs / totalDocs < 0.05) {
      throw new Error(
        `incident_onset_offset_minutes (${incidentOnsetOffsetMinutes}) leaves only ` +
          `${baselineDocs}/${totalDocs} doc(s) before the cut — the offset exceeds the ` +
          `snapshot's data window (~${spanMinutes} minute(s)). Reduce the scenario's ` +
          `live.incident_onset_offset_minutes.`
      );
    }

    log.info('Step 4/5: Preparing replay pipeline and managed stream write index...');
    const writeIndexInfo = await getWriteIndexInfo({ esClient, log });
    writeIndexName = writeIndexInfo.writeIndexName;
    previousDefaultPipeline = writeIndexInfo.previousDefaultPipeline;

    const chainedPipelineName = await getReplayChainPipeline({
      esClient,
      log,
      previousDefaultPipeline,
    });
    // maxTimestamp = the cut, so the newest baseline doc (just before the cut) lands at ~now.
    await createReplayPipeline({
      esClient,
      pipelineName,
      maxTimestamp: cutIso,
      chainedPipelineName,
    });
    await setWriteIndexDefaultPipeline({ esClient, writeIndexName, pipelineName, log });

    log.info('Step 5/5: Reindexing baseline documents into the managed logs stream...');
    const reindexResult = await esClient.reindex(
      {
        wait_for_completion: true,
        source: {
          index: tempIndices.join(','),
          query: { range: { '@timestamp': { lt: cutIso } } },
        },
        dest: { index: LOGS_STREAM_NAME, op_type: 'create' },
      },
      { requestTimeout: REINDEX_REQUEST_TIMEOUT_MS }
    );

    const total = reindexResult.total ?? 0;
    const created = reindexResult.created ?? 0;
    const stats: ReplayStats = { total, created, skipped: total - created };
    log.info(
      `Baseline replay complete: ${stats.created}/${stats.total} docs indexed, ${stats.skipped} skipped`
    );

    return { stats, tempIndices, cutTimestampMs, snapshotMaxTimestampMs };
  } finally {
    // Restore the previous pipeline so streamed tail docs get the normal stream processing.
    if (writeIndexName) {
      await esClient.indices
        .putSettings({
          index: writeIndexName,
          settings: { 'index.default_pipeline': previousDefaultPipeline },
        })
        .catch(() => log.warning('Failed to restore default_pipeline on write index'));
    }
    await esClient.ingest.deletePipeline({ id: pipelineName }).catch(() => {});
    await esClient.snapshot.deleteRepository({ name: repoName }).catch(() => {});
    // Temp indices are intentionally NOT deleted here — the tail streamer owns their cleanup.
  }
}
