/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { isIndexPattern } from '../../common/ai_index_dest';
import type { AiIndexAutomation, AiIndexDest } from '../../common/http_api/ai_indices';
import type { DeleteWorkflowsApi } from '../types';

/** Best-effort backing-store delete. Returns an error string on failure, null on success or 404. */
export const deleteBackingStoreResource = async ({
  esClient,
  dest,
  logger,
  aiIndexId,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  logger: Logger;
  aiIndexId: string;
}): Promise<string | null> => {
  if (isIndexPattern(dest.value)) {
    logger.warn(
      `Deleted AI index '${aiIndexId}', but did not delete its backing store: dest '${dest.value}' is an index pattern, not a single backing store`
    );
    return `Cannot delete the backing store '${dest.value}': it is an index pattern`;
  }

  try {
    if (dest.type === 'data_stream') {
      await esClient.indices.deleteDataStream({ name: dest.value });
    } else {
      await esClient.indices.delete({ index: dest.value });
    }
    return null;
  } catch (error) {
    if (isResponseError(error) && error.statusCode === 404) {
      return null;
    }
    const message = error instanceof Error ? error.message : String(error);
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
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Deleted AI index '${aiIndexId}', but failed to delete its automations: ${message}`
    );
    return [`Failed to delete automations: ${message}`];
  }
};
