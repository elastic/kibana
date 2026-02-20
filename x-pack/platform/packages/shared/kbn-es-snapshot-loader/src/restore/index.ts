/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RestoreConfig, LoadResult } from '../types';
import { getErrorMessage } from '../utils';
import { getSnapshotMetadata, deleteRepository, generateRepoName } from './repository';
import { filterIndicesToRestore, restoreIndices } from './restore';

export async function restoreSnapshot(config: RestoreConfig): Promise<LoadResult> {
  const { esClient, log, repository, snapshotName, indices } = config;

  const result: LoadResult = {
    success: false,
    snapshotName: '',
    restoredIndices: [],
    errors: [],
  };

  const repoName = generateRepoName();

  try {
    repository.validate();

    log.info('Step 1/3: Registering snapshot repository...');
    await repository.register({ esClient, log, repoName });

    log.info('Step 2/3: Retrieving snapshot metadata...');
    const snapshotInfo = await getSnapshotMetadata({
      esClient,
      log,
      repoName,
      snapshotName,
    });
    result.snapshotName = snapshotInfo.snapshot;

    const indicesToRestore = indices
      ? filterIndicesToRestore(snapshotInfo.indices, indices)
      : snapshotInfo.indices;

    log.info(`Found ${indicesToRestore.length} indices to restore`);

    if (indicesToRestore.length === 0) {
      throw new Error(
        `No indices in snapshot match the specified patterns: ${indices?.join(', ')}. ` +
          `Available indices: ${snapshotInfo.indices.slice(0, 10).join(', ')}${
            snapshotInfo.indices.length > 10 ? '...' : ''
          }`
      );
    }

    log.info('Step 3/3: Restoring indices...');
    const restoredIndices = await restoreIndices({
      esClient,
      log,
      repoName,
      snapshotName: snapshotInfo.snapshot,
      indices: indicesToRestore,
    });
    result.restoredIndices = restoredIndices;

    result.success = true;
    log.info(`Restore completed: ${restoredIndices.length} indices restored successfully`);
  } catch (error) {
    result.errors.push(getErrorMessage(error));
    log.error(`Snapshot restore failed: ${getErrorMessage(error)}`);
  } finally {
    log.debug('Cleaning up...');
    await deleteRepository({ esClient, log, repoName });
  }

  return result;
}
