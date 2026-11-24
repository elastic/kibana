/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  CONTEXT_ENGINE_ACTION_ADD_KI_WORKFLOW_ID,
  CONTEXT_ENGINE_ACTION_EDIT_KI_WORKFLOW_ID,
  CONTEXT_ENGINE_ACTION_REMOVE_KI_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

const ACTION_WORKFLOW_IDS = [
  CONTEXT_ENGINE_ACTION_ADD_KI_WORKFLOW_ID,
  CONTEXT_ENGINE_ACTION_EDIT_KI_WORKFLOW_ID,
  CONTEXT_ENGINE_ACTION_REMOVE_KI_WORKFLOW_ID,
] as const;

/**
 * Installs the action workflows an approved improvement runs, globally, so a proposal for one can
 * name it from any space. A static managed workflow exists only once its owning plugin installs it.
 */
export const installActionWorkflows = async ({
  workflowsExtensions,
  owner,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  owner: string;
  logger: Logger;
}): Promise<void> => {
  const client = await workflowsExtensions.initManagedWorkflowsClient(owner);

  let installedAll = true;
  for (const workflowId of ACTION_WORKFLOW_IDS) {
    try {
      await client.install(workflowId, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
    } catch (error) {
      installedAll = false;
      logger.error(
        `Failed to install managed workflow "${workflowId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (!installedAll) {
    logger.warn('Context Engine action workflow reconciliation skipped: an install failed');
    return;
  }

  try {
    await client.ready();
    logger.info('Context Engine action workflows installed');
  } catch (error) {
    logger.warn(
      `Context Engine action workflow reconciliation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
