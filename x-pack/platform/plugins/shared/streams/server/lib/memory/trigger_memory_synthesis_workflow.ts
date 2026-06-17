/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { STREAMS_MEMORY_SYNTHESIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

/**
 * Runs the managed memory synthesis workflow in the caller's current space.
 * Returns the execution id when started, or undefined when workflows are unavailable
 * or the managed workflow has not been installed yet.
 */
export interface MemorySynthesisInputs {
  user_feedback?: {
    aspect: 'root_cause' | 'hypothesis' | 'remediation';
    feedback: 'correct' | 'incorrect' | 'helpful' | 'not_helpful';
    discovery_id: string;
    hypothesis_id?: string;
    remediation_rank?: number;
  };
}

export const triggerMemorySynthesisWorkflow = async ({
  workflowsManagement,
  spaces,
  request,
  logger,
  triggeredBy = 'sigevents-memory-synthesis',
  inputs = {},
}: {
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaces?: SpacesPluginStart;
  request: KibanaRequest;
  logger: Logger;
  triggeredBy?: string;
  inputs?: MemorySynthesisInputs;
}): Promise<string | undefined> => {
  if (!workflowsManagement) {
    logger.debug('Workflows management not available, skipping memory synthesis trigger');
    return undefined;
  }

  const spaceId = spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
  const workflow = await workflowsManagement.management.getWorkflow(
    STREAMS_MEMORY_SYNTHESIS_WORKFLOW_ID,
    spaceId
  );

  if (!workflow || !workflow.definition) {
    logger.warn(
      `Managed workflow "${STREAMS_MEMORY_SYNTHESIS_WORKFLOW_ID}" not found, skipping memory synthesis`
    );
    return undefined;
  }

  const executionId = await workflowsManagement.management.runWorkflow(
    { ...workflow, definition: workflow.definition },
    spaceId,
    inputs,
    request,
    triggeredBy
  );

  logger.info(`Triggered memory synthesis workflow, executionId=${executionId}`);
  return executionId;
};
