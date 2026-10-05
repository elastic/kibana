/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  AGENT_BUILDER_MANAGED_WORKFLOW_PLUGIN_ID,
  CONVERSATION_SUMMARY_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

/**
 * Installs the conversation summary workflow globally. It is managed and not
 * billable. Failures are logged so a workflow install problem does not take
 * Agent Builder down.
 */
export const initializeConversationSummaryWorkflow = async ({
  workflowsExtensions,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
}): Promise<void> => {
  const client = await workflowsExtensions.initManagedWorkflowsClient(
    AGENT_BUILDER_MANAGED_WORKFLOW_PLUGIN_ID
  );

  try {
    await client.install(CONVERSATION_SUMMARY_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
    await client.ready();
  } catch (error) {
    logger.error(
      `Failed to install conversation summary workflow: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
