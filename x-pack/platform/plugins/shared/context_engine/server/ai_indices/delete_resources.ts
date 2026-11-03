/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  IScopedClusterClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { formatErrorMessage } from '../utils/format_es_error';
import { MAX_AI_INDICES } from '../../common/constants';
import { isIndexPattern } from '../../common/ai_index_dest';
import type { AiIndexAutomation, AiIndexDest } from '../../common/http_api/ai_indices';
import type { DeleteWorkflowsApi } from '../types';
import { listAiIndexRecords } from './registry_api';

/**
 * Other registry entries pointing at the same backing store, labelled `space/id` when they live in
 * another space.
 */
const findOtherUsersOfDest = async (
  esClient: ElasticsearchClient,
  destValue: string,
  exclude: { aiIndexId: string; spaceId: string }
): Promise<string[]> => {
  // No space: a backing store may be shared by entries in other spaces.
  const records = await listAiIndexRecords(esClient, { dest: destValue, size: MAX_AI_INDICES });
  return records.flatMap(({ id, space }) => {
    if (id === exclude.aiIndexId && space === exclude.spaceId) {
      return [];
    }
    return [space === exclude.spaceId ? id : `${space}/${id}`];
  });
};

/** Best-effort backing-store delete. Returns an error string on failure, null on success or 404. */
export const deleteBackingStoreResource = async ({
  esClient,
  dest,
  logger,
  aiIndexId,
  spaceId,
}: {
  esClient: IScopedClusterClient;
  dest: AiIndexDest;
  logger: Logger;
  aiIndexId: string;
  spaceId: string;
}): Promise<string | null> => {
  if (isIndexPattern(dest.value)) {
    logger.warn(
      `Deleted AI index '${aiIndexId}', but did not delete its backing store: dest '${dest.value}' is an index pattern, not a single backing store`
    );
    return `Cannot delete the backing store '${dest.value}': it is an index pattern`;
  }

  const otherIds = await findOtherUsersOfDest(esClient.asInternalUser, dest.value, {
    aiIndexId,
    spaceId,
  });
  if (otherIds.length > 0) {
    const message = `Did not delete the backing store '${
      dest.value
    }': it is still used by other AI indices (${otherIds.join(', ')})`;
    logger.warn(`Deleted AI index '${aiIndexId}', but ${message}`);
    return message;
  }

  try {
    if (dest.type === 'data_stream') {
      await esClient.asCurrentUser.indices.deleteDataStream({ name: dest.value });
    } else {
      await esClient.asCurrentUser.indices.delete({ index: dest.value });
    }
    return null;
  } catch (error) {
    if (isResponseError(error) && error.statusCode === 404) {
      return null;
    }
    const message = formatErrorMessage(error);
    logger.warn(
      `Deleted AI index '${aiIndexId}', but failed to delete its backing store '${dest.value}': ${message}`
    );
    return `Failed to delete the backing store '${dest.value}': ${message}`;
  }
};

/**
 * Best-effort deletion of workflow automations. Returns one error string per failure.
 */
export const deleteAutomationResources = async ({
  automations,
  workflowsManagementApi,
  spaceId,
  request,
  logger,
  aiIndexId,
}: {
  automations: AiIndexAutomation[];
  workflowsManagementApi: DeleteWorkflowsApi | undefined;
  spaceId: string;
  request: KibanaRequest;
  logger: Logger;
  aiIndexId: string;
}): Promise<string[]> => {
  const workflowIds = automations
    .filter((automation) => automation.type === 'workflow')
    .map((automation) => automation.value);

  if (workflowIds.length === 0) {
    return [];
  }

  if (!workflowsManagementApi) {
    const message = 'Workflows management is unavailable.';
    logger.warn(
      `Deleted AI index '${aiIndexId}', but could not delete its automations: ${message}`
    );
    return [`Failed to delete automations: ${message}`];
  }

  try {
    const result = await workflowsManagementApi.deleteWorkflows(workflowIds, spaceId, request, {
      force: true,
    });

    if (result.failures.length > 0) {
      logger.warn(
        `Deleted AI index '${aiIndexId}', but failed to delete ${result.failures.length} of ${workflowIds.length} automations.`
      );
      return result.failures.map(
        ({ id, error }) => `Failed to delete automation '${id}': ${error}`
      );
    }

    return [];
  } catch (error) {
    const message = formatErrorMessage(error);
    logger.warn(
      `Deleted AI index '${aiIndexId}', but failed to delete its automations: ${message}`
    );
    return [`Failed to delete automations: ${message}`];
  }
};
