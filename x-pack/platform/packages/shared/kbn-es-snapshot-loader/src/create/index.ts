/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateConfig, CreateResult } from '../types';
import { getErrorMessage } from '../utils';
import { deleteRepository, generateRepoName } from '../repository';

export async function createSnapshot(config: CreateConfig): Promise<CreateResult> {
  const { esClient, log, repository, snapshotName, indices, ignoreUnavailable } = config;

  const result: CreateResult = {
    success: false,
    snapshotName,
    indices: [],
    errors: [],
  };

  const repoName = generateRepoName();

  try {
    repository.validate();

    log.info('Step 1/2: Registering snapshot repository...');
    await repository.register({ esClient, log, repoName });

    log.info(`Step 2/2: Creating snapshot "${snapshotName}"...`);
    const response = await esClient.snapshot.create({
      repository: repoName,
      snapshot: snapshotName,
      wait_for_completion: true,
      include_global_state: false,
      ignore_unavailable: ignoreUnavailable ?? false,
      ...(indices && indices.length > 0 ? { indices: indices.join(',') } : {}),
    });

    const capturedIndices = response.snapshot?.indices;
    if (!capturedIndices || capturedIndices.length === 0) {
      throw new Error('Snapshot was created but no indices were captured');
    }
    result.indices = capturedIndices;
    result.success = true;
    log.info(`Snapshot creation completed: ${result.indices.length} indices captured`);
  } catch (error) {
    result.errors.push(getErrorMessage(error));
    log.error(`Snapshot creation failed: ${getErrorMessage(error)}`);
  } finally {
    log.debug('Cleaning up...');
    await deleteRepository({ esClient, log, repoName });
  }

  return result;
}
