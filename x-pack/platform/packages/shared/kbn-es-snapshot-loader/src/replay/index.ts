/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ReplayConfig, LoadResult } from '../types';

export const TEMP_INDEX_PREFIX = 'snapshot-loader-temp-';
import { getErrorMessage } from '../utils';
import {
  registerUrlRepository,
  getSnapshotMetadata,
  deleteRepository,
  generateRepoName,
} from '../restore/repository';
import { filterIndicesToRestore, restoreIndices } from '../restore/restore';
import { createTimestampPipeline, deletePipeline } from './pipeline';
import { reindexAllIndices } from './reindex';
import { verifyIndexTemplates } from './templates';

export async function replaySnapshot(config: ReplayConfig): Promise<LoadResult> {
  const { esClient, logger, snapshotUrl, patterns } = config;

  const result: LoadResult = {
    success: false,
    snapshotName: '',
    restoredIndices: [],
    reindexedIndices: [],
    maxTimestamp: '',
    errors: [],
  };

  const repoName = generateRepoName();

  try {
    logger.info('Step 1/5: Registering snapshot repository...');
    await registerUrlRepository({ esClient, logger, repoName, snapshotUrl });

    logger.info('Step 2/5: Retrieving snapshot metadata...');
    const snapshotInfo = await getSnapshotMetadata({ esClient, logger, repoName });
    result.snapshotName = snapshotInfo.snapshot;
    result.maxTimestamp = snapshotInfo.endTime;

    const indicesToRestore = filterIndicesToRestore(snapshotInfo.indices, patterns);
    logger.info(
      `Found ${indicesToRestore.length} indices matching patterns: ${patterns.join(', ')}`
    );

    if (indicesToRestore.length === 0) {
      throw new Error(
        `No indices in snapshot match the specified patterns: ${patterns.join(', ')}. ` +
          `Available indices: ${snapshotInfo.indices.slice(0, 10).join(', ')}${
            snapshotInfo.indices.length > 10 ? '...' : ''
          }`
      );
    }

    logger.info('Step 3/5: Verifying index templates...');
    await verifyIndexTemplates({ esClient, logger, patterns });

    logger.info('Step 4/5: Restoring to temporary indices...');
    const restoredIndices = await restoreIndices({
      esClient,
      logger,
      repoName,
      snapshotName: snapshotInfo.snapshot,
      indices: indicesToRestore,
      renamePattern: '(.+)',
      renameReplacement: `${TEMP_INDEX_PREFIX}$1`,
    });
    result.restoredIndices = restoredIndices;

    await createTimestampPipeline({
      esClient,
      logger,
      maxTimestamp: result.maxTimestamp!,
    });

    logger.info('Step 5/5: Reindexing with timestamp transformation...');
    const reindexedIndices = await reindexAllIndices({
      esClient,
      logger,
      restoredIndices,
      originalIndices: indicesToRestore,
    });
    result.reindexedIndices = reindexedIndices;

    result.success = reindexedIndices.length > 0;

    logger.info(
      `Replay completed: ${reindexedIndices.length}/${indicesToRestore.length} indices reindexed successfully`
    );
  } catch (error) {
    result.errors.push(getErrorMessage(error));
    logger.error(`Snapshot replay failed: ${getErrorMessage(error)}`);
  } finally {
    logger.debug('Cleaning up...');
    await cleanup({ esClient, logger, repoName, restoredIndices: result.restoredIndices });
  }

  return result;
}

async function cleanup({
  esClient,
  logger,
  repoName,
  restoredIndices,
}: {
  esClient: Client;
  logger: Logger;
  repoName: string;
  restoredIndices: string[];
}): Promise<void> {
  for (const index of restoredIndices) {
    try {
      await esClient.indices.delete({ index, ignore_unavailable: true });
    } catch {
      logger.debug(`Failed to delete temp index: ${index}`);
    }
  }
  await deletePipeline({ esClient, logger });
  await deleteRepository({ esClient, logger, repoName });
}
