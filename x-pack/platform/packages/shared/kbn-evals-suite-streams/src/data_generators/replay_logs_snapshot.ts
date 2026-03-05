/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { isNotFoundError, isResponseError } from '@kbn/es-errors';
import type { ToolingLog } from '@kbn/tooling-log';
import { createGcsRepository, replaySnapshot } from '@kbn/es-snapshot-loader';
import { deleteLogsIndexTemplate, ensureLogsIndexTemplate } from './logs_index_template';
import type { GcsConfig } from './snapshot_run_config';
import { resolveBasePath } from './snapshot_run_config';

const LOGS_STREAM_NAME = 'logs';
const LOGS_STREAM_WILDCARD = 'logs*';
// Matches temp indices created by replayIntoManagedStream (query generation) that have ingest
// pipelines (e.g. logs.ecs@stream.processing) set as their default. If these are left behind by
// a killed run they must be removed before cleanSignificantEventsDataStreams can delete the
// parent data streams — otherwise the Streams plugin's disableStreams call fails because ES
// refuses to delete a pipeline that is still referenced as the default pipeline for an index.
const REPLAY_TEMP_INDEX_PATTERN = 'sigevents-replay-temp-*';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const isDataStreamDeleteConflict = (error: unknown): boolean => {
  if (!isResponseError(error) || error.statusCode !== 400) {
    return false;
  }

  const reason =
    typeof error.body?.error?.reason === 'string'
      ? error.body.error.reason
      : getErrorMessage(error);
  const message = reason.toLowerCase();
  return message.includes('data stream') && message.includes('cannot be deleted');
};

export async function replaySignificantEventsSnapshot(
  esClient: Client,
  log: ToolingLog,
  snapshotName: string,
  gcs: GcsConfig
) {
  log.debug(`Replaying significant events data from snapshot: ${snapshotName}`);

  await cleanSignificantEventsDataStreams(esClient, log);
  await ensureLogsIndexTemplate(esClient, log);

  const basePath = resolveBasePath(gcs);
  await replaySnapshot({
    esClient,
    log,
    repository: createGcsRepository({ bucket: gcs.bucket, basePath }),
    snapshotName,
    patterns: [LOGS_STREAM_WILDCARD],
  });
}

export async function cleanSignificantEventsDataStreams(
  esClient: Client,
  log: ToolingLog
): Promise<void> {
  // Remove any orphaned replay temp indices first. These are created by replayIntoManagedStream
  // during query generation and may be left behind if the process is killed mid-run. They hold
  // references to managed ingest pipelines (e.g. logs.ecs@stream.processing), which prevents the
  // Streams plugin from deleting those pipelines when we subsequently remove the log data streams.
  try {
    // expand_wildcards: 'all' is required to match hidden .ds-* backing indices
    await esClient.indices.delete({
      index: REPLAY_TEMP_INDEX_PATTERN,
      ignore_unavailable: true,
      expand_wildcards: 'all',
    });
    log.debug(`Deleted orphaned replay temp indices matching ${REPLAY_TEMP_INDEX_PATTERN}`);
  } catch (e) {
    log.debug(`Failed to pre-clean replay temp indices (safe to ignore): ${getErrorMessage(e)}`);
  }

  const [deleteDataStreamResult, deleteIndexResult] = await Promise.allSettled([
    esClient.indices.deleteDataStream({ name: LOGS_STREAM_WILDCARD }),
    esClient.indices.delete({ index: LOGS_STREAM_WILDCARD, ignore_unavailable: true }),
  ]);

  if (
    deleteDataStreamResult.status === 'rejected' &&
    !isNotFoundError(deleteDataStreamResult.reason)
  ) {
    log.debug(
      `Failed to delete ${LOGS_STREAM_NAME} data stream: ${getErrorMessage(
        deleteDataStreamResult.reason
      )}`
    );
  }

  if (
    deleteIndexResult.status === 'rejected' &&
    !isNotFoundError(deleteIndexResult.reason) &&
    !isDataStreamDeleteConflict(deleteIndexResult.reason)
  ) {
    log.debug(
      `Failed to delete ${LOGS_STREAM_NAME} index: ${getErrorMessage(deleteIndexResult.reason)}`
    );
  }

  await deleteLogsIndexTemplate(esClient, log);
}
