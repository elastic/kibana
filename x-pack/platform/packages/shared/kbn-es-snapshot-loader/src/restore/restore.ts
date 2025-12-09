/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import pRetry from 'p-retry';
import type { RestoreStatus } from '../types';
import { extractDataStreamName } from '../utils';

export function filterIndicesToRestore(snapshotIndices: string[], patterns: string[]): string[] {
  return snapshotIndices.filter((index) => {
    const dataStreamName = extractDataStreamName(index);
    const namesToCheck = dataStreamName ? [index, dataStreamName] : [index];

    return patterns.some((pattern) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return namesToCheck.some((name) => regex.test(name));
    });
  });
}

export async function restoreIndices({
  esClient,
  logger,
  repoName,
  snapshotName,
  indices,
  renamePattern,
  renameReplacement,
}: {
  esClient: Client;
  logger: Logger;
  repoName: string;
  snapshotName: string;
  indices: string[];
  renamePattern?: string;
  renameReplacement?: string;
}): Promise<string[]> {
  if (indices.length === 0) {
    throw new Error('No indices specified for restore');
  }

  const hasRename = renamePattern && renameReplacement;
  logger.debug(`Restoring ${indices.length} indices${hasRename ? ' to temp location' : ''}`);

  await esClient.snapshot.restore({
    repository: repoName,
    snapshot: snapshotName,
    wait_for_completion: false,
    indices: indices.join(','),
    include_global_state: false,
    ...(hasRename && { rename_pattern: renamePattern, rename_replacement: renameReplacement }),
  });

  const restoredNames = hasRename
    ? indices.map((idx) => idx.replace(new RegExp(renamePattern), renameReplacement))
    : indices;

  logger.info(`Restore initiated for ${restoredNames.length} indices`);
  return restoredNames;
}

export async function waitForRestore({
  esClient,
  logger,
  restoredIndices,
}: {
  esClient: Client;
  logger: Logger;
  restoredIndices: string[];
}): Promise<void> {
  logger.debug(`Waiting for restore to complete`);

  await pRetry(
    async () => {
      const recoveryResponse = await esClient.indices.recovery({
        index: restoredIndices.join(','),
      });
      const status = parseRestoreStatus(recoveryResponse);

      if (status.failed) {
        const failedIndices = Object.entries(status.indices)
          .filter(([, s]) => s.failed)
          .map(([name]) => name);
        throw new pRetry.AbortError(`Restore failed for indices: ${failedIndices.join(', ')}`);
      }

      if (!status.completed) {
        const pending = Object.keys(status.indices).filter(
          (k) => !status.indices[k].completed
        ).length;
        logger.debug(`Restore in progress (${pending} indices remaining)...`);
        throw new Error('Restore not completed');
      }

      logger.info('Restore completed successfully');
    },
    { retries: 60, minTimeout: 1000, maxTimeout: 30000, factor: 1.5 }
  );
}

export function parseRestoreStatus(recoveryResponse: Record<string, unknown>): RestoreStatus {
  const indices: RestoreStatus['indices'] = {};
  let allCompleted = true;
  let anyFailed = false;

  for (const [indexName, indexData] of Object.entries(recoveryResponse)) {
    const shards = (indexData as { shards?: Array<{ stage?: string }> })?.shards ?? [];
    const completed = shards.every((shard) => shard.stage === 'DONE');
    const failed = shards.some((shard) => shard.stage === 'FAILURE' || shard.stage === 'FAILED');

    indices[indexName] = { completed, failed };
    if (!completed) allCompleted = false;
    if (failed) anyFailed = true;
  }

  return { completed: allCompleted && Object.keys(indices).length > 0, failed: anyFailed, indices };
}

export async function deleteIndices({
  esClient,
  logger,
  indexPattern,
}: {
  esClient: Client;
  logger: Logger;
  indexPattern: string;
}): Promise<void> {
  logger.debug(`Deleting indices: ${indexPattern}`);
  try {
    await esClient.indices.delete({ index: indexPattern, ignore_unavailable: true });
  } catch (error) {
    logger.debug(`Failed to delete indices: ${error}`);
  }
}
