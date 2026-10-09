/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

/**
 * Runs the managed memory synthesis workflow. The workflow document is global;
 * the execution is started in the caller's current space so it appears in that
 * space's Workflows UI. Returns the execution id when started, or undefined when
 * workflows are unavailable or the managed workflow has not been installed yet.
 */
export const triggerMemorySynthesisWorkflow = async ({
  workflowsManagement,
  spaces,
  request,
  logger,
  triggeredBy = 'significant-events-memory-synthesis',
}: {
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaces?: SpacesPluginStart;
  request: KibanaRequest;
  logger: Logger;
  triggeredBy?: string;
}): Promise<string | undefined> => {
  if (!workflowsManagement) {
    logger.debug('Workflows management not available, skipping memory synthesis trigger');
    return undefined;
  }

  const executionSpaceId = spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
  const workflow = await workflowsManagement.management.getWorkflow(
    SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
    GLOBAL_WORKFLOW_SPACE_ID
  );

  if (!workflow || !workflow.definition) {
    logger.warn(
      `Managed workflow "${SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID}" not found, skipping memory synthesis`
    );
    return undefined;
  }

  const executionId = await workflowsManagement.management.runWorkflow(
    { ...workflow, definition: workflow.definition },
    executionSpaceId,
    {},
    request,
    triggeredBy
  );

  logger.info(`Triggered memory synthesis workflow, executionId=${executionId}`);
  return executionId;
};
