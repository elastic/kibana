/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

export const LOGS_STREAM_NAME = 'logs';
export const REINDEX_REQUEST_TIMEOUT_MS = 30 * 60 * 1000;
export const MAX_LOGGED_REINDEX_FAILURES = 5;

// Shift every document so the newest sits at the replay anchor (`params.now_millis`,
// a single value fixed by the caller), preserving relative gaps, and null out `_id`
// so reindex assigns fresh ids (snapshot ids would collide). The anchor is passed in
// rather than read via `System.currentTimeMillis()` per document so it stays constant
// across the whole reindex and can't reorder near-simultaneous documents.
export const TIMESTAMP_TRANSFORM_SCRIPT = `
  ctx._id = null;
  if (ctx.containsKey('@timestamp') && ctx['@timestamp'] != null) {
    Instant maxTime = Instant.parse(params.max_timestamp);
    Instant originalTime = Instant.parse(ctx['@timestamp'].toString());
    long deltaMillis = maxTime.toEpochMilli() - originalTime.toEpochMilli();
    Instant now = Instant.ofEpochMilli(params.now_millis);
    ctx['@timestamp'] = now.minusMillis(deltaMillis).toString();
  }
`;

export interface ReplayStats {
  total: number;
  created: number;
  skipped: number;
}

interface ReindexFailure {
  cause?: { reason?: string; type?: string };
}

/**
 * Returns the `logs` data stream's own backing indices (`.ds-logs-<date>-<gen>`)
 * from a snapshot. The hyphen matters: `.ds-logs` alone would also match sibling
 * streams like `logs.ecs` (`.ds-logs.ecs-…`), which these evals do not target.
 */
export const getLogsIndicesFromSnapshot = async ({
  esClient,
  repoName,
  snapshotName,
}: {
  esClient: Client;
  repoName: string;
  snapshotName: string;
}): Promise<string[]> => {
  const snapshotInfo = await esClient.snapshot.get({
    repository: repoName,
    snapshot: snapshotName,
  });
  const snapshot = snapshotInfo.snapshots?.[0];
  if (!snapshot) {
    throw new Error(`Snapshot "${snapshotName}" not found in repository "${repoName}"`);
  }

  const logsIndices = (snapshot.indices ?? []).filter(
    (indexName) => indexName.startsWith('.ds-logs-') || indexName === LOGS_STREAM_NAME
  );
  if (logsIndices.length === 0) {
    throw new Error(`No logs indices found in snapshot "${snapshotName}"`);
  }
  return logsIndices;
};

/**
 * Deletes every index matching `${prefix}*`. Serverless rejects wildcard/`_all`
 * deletes ("Wildcard expressions or all indices are not allowed"), so the
 * concrete names are resolved with a GET (which does allow wildcards) and then
 * deleted explicitly.
 */
export const deleteIndicesByPrefix = async (
  esClient: Client,
  log: ToolingLog,
  prefix: string
): Promise<void> => {
  try {
    const resolved = await esClient.indices.get({
      index: `${prefix}*`,
      expand_wildcards: 'all',
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    const indexNames = Object.keys(resolved);
    if (indexNames.length === 0) {
      return;
    }
    await esClient.indices.delete({
      index: indexNames,
      expand_wildcards: 'all',
      ignore_unavailable: true,
    });
    log.debug(`Deleted ${indexNames.length} indices matching "${prefix}*"`);
  } catch (error) {
    log.warning(
      `Failed to delete indices matching "${prefix}*": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export const logReindexFailures = ({
  log,
  failures,
  skipped,
}: {
  log: ToolingLog;
  failures: ReindexFailure[];
  skipped: number;
}): void => {
  log.warning(`Reindex: ${skipped} docs skipped due to mapping conflicts`);
  for (const failure of failures.slice(0, MAX_LOGGED_REINDEX_FAILURES)) {
    const reason = failure.cause?.reason?.split('\n')[0]?.slice(0, 150) ?? 'unknown';
    log.debug(`  - ${failure.cause?.type ?? 'error'}: ${reason}`);
  }
  if (failures.length > MAX_LOGGED_REINDEX_FAILURES) {
    log.debug(`  ... and ${failures.length - MAX_LOGGED_REINDEX_FAILURES} more`);
  }
};

/**
 * Distills a reindex response into {@link ReplayStats}, logging any per-document
 * failures. `skipped` is `total - created`, i.e. documents dropped (typically
 * mapping conflicts) rather than an error surfaced by the request itself.
 */
export const summarizeReindexResult = ({
  reindexResult,
  log,
}: {
  reindexResult: { total?: number; created?: number; failures?: unknown[] };
  log: ToolingLog;
}): ReplayStats => {
  const total = reindexResult.total ?? 0;
  const created = reindexResult.created ?? 0;
  const failures = (reindexResult.failures ?? []) as ReindexFailure[];
  const skipped = total - created;

  if (failures.length > 0) {
    logReindexFailures({ log, failures, skipped });
  }

  return { total, created, skipped };
};
