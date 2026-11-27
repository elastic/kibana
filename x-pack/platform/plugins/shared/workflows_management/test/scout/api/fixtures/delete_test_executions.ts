/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { EsClient } from '@kbn/scout';
import {
  WORKFLOWS_EXECUTIONS_DATA_STREAM,
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../../../common';

const EXECUTION_STORAGE_TARGETS = [
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
  WORKFLOWS_EXECUTIONS_DATA_STREAM,
  WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
] as const;

const resolveExistingExecutionTargets = async (esClient: EsClient): Promise<string[]> => {
  const existing: string[] = [];
  for (const index of EXECUTION_STORAGE_TARGETS) {
    if (await esClient.indices.exists({ index })) {
      existing.push(index);
    }
  }
  return existing;
};

/** Removes unsaved execution documents created by this suite. */
export const deleteTestExecutions = async (
  esClient: EsClient,
  spaceId: string,
  executionIds: string[]
): Promise<void> => {
  if (executionIds.length === 0) return;
  const indices = await resolveExistingExecutionTargets(esClient);
  if (indices.length === 0) {
    return;
  }
  const cleanupUser = `workflow-cleanup-${randomUUID()}`;
  await esClient.security.putRole({
    name: cleanupUser,
    indices: [
      {
        names: [...EXECUTION_STORAGE_TARGETS],
        privileges: ['read', 'delete', 'maintenance'],
        allow_restricted_indices: true,
      },
    ],
  });
  try {
    await esClient.security.putUser({
      username: cleanupUser,
      password: randomUUID(),
      roles: [cleanupUser],
    });
    const transportOptions = { headers: { 'es-security-runas-user': cleanupUser } };
    await esClient.indices.refresh({ index: indices, ignore_unavailable: true }, transportOptions);
    const result = await esClient.deleteByQuery(
      {
        index: indices,
        refresh: true,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [{ term: { spaceId } }],
            should: [{ ids: { values: executionIds } }, { terms: { workflowRunId: executionIds } }],
            minimum_should_match: 1,
          },
        },
      },
      transportOptions
    );
    if (result.timed_out || result.failures?.length) {
      throw new Error('Failed to remove test execution documents');
    }
  } finally {
    await esClient.security.deleteUser({ username: cleanupUser });
    await esClient.security.deleteRole({ name: cleanupUser });
  }
};
