/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createGcsRepository, restoreSnapshot } from '@kbn/es-snapshot-loader';
import type { RegressionCorpus } from './regression_corpora';
import { ALL_REGRESSION_CORPORA } from './regression_corpora';

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
 * Attempts × per-attempt health timeout bound how long a worker waits for another
 * worker's in-flight restore of the same corpus (~20 minutes, comfortably above the
 * largest corpus's restore time at the raised recovery cap).
 */
const ACTIVE_WAIT_ATTEMPTS = 20;
const ACTIVE_WAIT_TIMEOUT_SECONDS = 60;

const waitForActiveShards = async ({
  esClient,
  log,
  suite,
  corpus,
}: {
  esClient: Client;
  log: ToolingLog;
  suite: string;
  corpus: RegressionCorpus;
}): Promise<void> => {
  for (let attempt = 1; attempt <= ACTIVE_WAIT_ATTEMPTS; attempt++) {
    const health = await esClient.cluster.health(
      {
        index: corpus.indices.join(','),
        wait_for_active_shards: 'all',
        timeout: `${ACTIVE_WAIT_TIMEOUT_SECONDS}s`,
      },
      { ignore: [408], requestTimeout: (ACTIVE_WAIT_TIMEOUT_SECONDS + 10) * 1000 }
    );
    if (!health.timed_out) {
      return;
    }
    log.info(
      `[${suite}] waiting for "${corpus.name}" corpus shards to become active ` +
        `(attempt ${attempt}/${ACTIVE_WAIT_ATTEMPTS})`
    );
  }
  throw new Error(
    `[${suite}] "${corpus.name}" corpus indices did not become active within ` +
      `${ACTIVE_WAIT_ATTEMPTS * ACTIVE_WAIT_TIMEOUT_SECONDS} seconds`
  );
};

const raiseRecoveryThrottle = async ({
  esClient,
  log,
  suite,
}: {
  esClient: Client;
  log: ToolingLog;
  suite: string;
}): Promise<void> => {
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
};

const ensureCorpus = async ({
  esClient,
  log,
  suite,
  corpus,
}: {
  esClient: Client;
  log: ToolingLog;
  suite: string;
  corpus: RegressionCorpus;
}): Promise<void> => {
  const missing: string[] = [];
  for (const index of corpus.indices) {
    if (!(await esClient.indices.exists({ index }))) {
      missing.push(index);
    }
  }
  if (missing.length === 0) {
    // Present is not the same as ready: another worker's restore creates the indices at
    // recovery start, so wait until every shard is active before any example runs.
    await waitForActiveShards({ esClient, log, suite, corpus });
    log.info(
      `[${suite}] all ${corpus.indices.length} "${corpus.name}" corpus indices present and active`
    );
    return;
  }
  if (!process.env.GCS_CREDENTIALS) {
    throw new Error(
      `[${suite}] "${corpus.name}" corpus indices missing (${missing.join(', ')}) and ` +
        'GCS_CREDENTIALS is not set, so the snapshot cannot be restored. Load the ' +
        `"${corpus.snapshot.snapshotName}" snapshot or run through \`node scripts/evals start\` ` +
        'with a profile that provides GCS credentials.'
    );
  }

  await raiseRecoveryThrottle({ esClient, log, suite });

  log.info(
    `[${suite}] restoring ${missing.length} "${corpus.name}" corpus indices from snapshot ` +
      `"${corpus.snapshot.snapshotName}"`
  );
  const result = await restoreSnapshot({
    esClient,
    log,
    repository: createGcsRepository({
      bucket: corpus.snapshot.bucket,
      basePath: corpus.snapshot.basePath,
    }),
    snapshotName: corpus.snapshot.snapshotName,
    indices: missing,
    // Fresh CI stacks are single-node, where replica copies could never allocate; drop
    // them so the restored indices go green (this also engages the loader's
    // active-shards wait before returning).
    indexSettings: { 'index.number_of_replicas': 0 },
  });
  if (!result.success) {
    // Another worker may have started restoring the same corpus between our existence
    // check and the restore call. If the indices exist now, treat the lost race as
    // success and wait for the winner's restore to finish instead.
    const stillMissing: string[] = [];
    for (const index of missing) {
      if (!(await esClient.indices.exists({ index }))) {
        stillMissing.push(index);
      }
    }
    if (stillMissing.length > 0) {
      throw new Error(
        `[${suite}] "${corpus.name}" snapshot restore failed: ${result.errors.join('; ')}`
      );
    }
    log.info(
      `[${suite}] "${corpus.name}" corpus is being restored by another worker; waiting for it`
    );
    await waitForActiveShards({ esClient, log, suite, corpus });
  }
};

/**
 * Ensures every regression corpus is present and ready in the target cluster, restoring
 * what is missing from GCS. The datasets' ground truth (doc `_id`s, expected values) is
 * literal to the pinned corpus builds, so running against a cluster without them would
 * score garbage into the regression baselines: restore what is missing and fail fast
 * when that is not possible. On an ephemeral CI cluster every index is missing, so this
 * performs the full restore on every run; on clusters that already hold the corpora
 * (local reruns, persistent eval clusters) it only verifies presence.
 *
 * All corpora are ensured — not just the calling spec's — so every run sees the same
 * index-discovery landscape regardless of Playwright worker scheduling, and no example
 * executes while another corpus is still restoring. (This means a local run of a single
 * spec also needs the other corpora; that is the price of comparable runs.)
 */
export const ensureRegressionCorporaRestored = async ({
  esClient,
  log,
  suite,
  corpus,
  datasetIndices,
}: {
  esClient: Client;
  log: ToolingLog;
  /** Log/error prefix, e.g. `browsecomp-plus-regression`. */
  suite: string;
  /** The calling spec's own corpus; its dataset must only reference indices in it. */
  corpus: RegressionCorpus;
  /** The indices the dataset's ground truth references. */
  datasetIndices: string[];
}): Promise<void> => {
  // Guard against dataset edits referencing an index the snapshot does not contain.
  const unknownIndices = datasetIndices.filter((index) => !corpus.indices.includes(index));
  if (unknownIndices.length > 0) {
    throw new Error(
      `[${suite}] dataset references indices not in the "${corpus.name}" corpus snapshot: ` +
        unknownIndices.join(', ')
    );
  }

  for (const regressionCorpus of ALL_REGRESSION_CORPORA) {
    await ensureCorpus({ esClient, log, suite, corpus: regressionCorpus });
  }
};
