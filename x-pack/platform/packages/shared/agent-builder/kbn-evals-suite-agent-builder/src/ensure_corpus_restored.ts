/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createGcsRepository, restoreSnapshot } from '@kbn/es-snapshot-loader';

export interface CorpusSnapshot {
  bucket: string;
  basePath: string;
  snapshotName: string;
}

/**
 * Snapshot restores recover through `indices.recovery.max_bytes_per_sec` (40mb/s by
 * default), which would put the larger corpora (~9.5GB) over the snapshot loader's
 * 5-minute restore request timeout on a fresh CI cluster. Raised before restoring and
 * left in place: concurrent Playwright workers restore different corpora into the same
 * cluster, so resetting from the first worker to finish would throttle the others
 * mid-restore.
 */
const RESTORE_RECOVERY_MAX_BYTES_PER_SEC = '500mb';

/**
 * Ensures the pinned corpus snapshot is present in the target cluster, restoring any
 * missing indices from GCS. The regression datasets' ground truth (doc `_id`s, expected
 * values) is literal to the pinned corpus build, so running against a cluster without it
 * would score garbage into the regression baselines: restore what is missing and fail
 * fast when that is not possible. On an ephemeral CI cluster every index is missing, so
 * this performs the full restore on every run.
 */
export const ensureCorpusRestored = async ({
  esClient,
  log,
  suite,
  snapshot,
  corpusIndices,
  datasetIndices,
}: {
  esClient: Client;
  log: ToolingLog;
  /** Log/error prefix, e.g. `browsecomp-plus-regression`. */
  suite: string;
  snapshot: CorpusSnapshot;
  corpusIndices: readonly string[];
  /** The indices the dataset's ground truth references; must be a subset of the corpus. */
  datasetIndices: string[];
}): Promise<void> => {
  // Guard against dataset edits referencing an index the snapshot does not contain.
  const unknownIndices = datasetIndices.filter((index) => !corpusIndices.includes(index));
  if (unknownIndices.length > 0) {
    throw new Error(
      `[${suite}] dataset references indices not in the corpus snapshot: ${unknownIndices.join(
        ', '
      )}`
    );
  }

  const missing: string[] = [];
  for (const index of corpusIndices) {
    if (!(await esClient.indices.exists({ index }))) {
      missing.push(index);
    }
  }
  if (missing.length === 0) {
    log.info(`[${suite}] all ${corpusIndices.length} corpus indices present`);
    return;
  }
  if (!process.env.GCS_CREDENTIALS) {
    throw new Error(
      `[${suite}] corpus indices missing (${missing.join(', ')}) and ` +
        'GCS_CREDENTIALS is not set, so the snapshot cannot be restored. Load the ' +
        `"${snapshot.snapshotName}" snapshot or run through \`node scripts/evals start\` ` +
        'with a profile that provides GCS credentials.'
    );
  }

  // Best-effort: a cluster that rejects the settings change may still restore the
  // smaller corpora within the loader's timeout.
  try {
    await esClient.cluster.putSettings({
      persistent: {
        'indices.recovery.max_bytes_per_sec': RESTORE_RECOVERY_MAX_BYTES_PER_SEC,
      },
    });
  } catch (error) {
    log.warning(
      `[${suite}] could not raise indices.recovery.max_bytes_per_sec, large restores may time out: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  log.info(
    `[${suite}] restoring ${missing.length} corpus indices from snapshot ` +
      `"${snapshot.snapshotName}"`
  );
  const result = await restoreSnapshot({
    esClient,
    log,
    repository: createGcsRepository({
      bucket: snapshot.bucket,
      basePath: snapshot.basePath,
    }),
    snapshotName: snapshot.snapshotName,
    indices: missing,
    // Fresh CI stacks are single-node, where replica copies could never allocate; drop
    // them so the restored indices go green (this also engages the loader's
    // active-shards wait before returning).
    indexSettings: { 'index.number_of_replicas': 0 },
  });
  if (!result.success) {
    throw new Error(`[${suite}] snapshot restore failed: ${result.errors.join('; ')}`);
  }
};
