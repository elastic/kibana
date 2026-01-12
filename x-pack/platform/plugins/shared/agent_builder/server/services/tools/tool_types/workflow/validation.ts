/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/agent-builder-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

export const validateWorkflowId = async ({
  workflows,
  workflowId,
  spaceId,
}: {
  workflows: WorkflowsServerPluginSetup;
  workflowId: string;
  spaceId: string;
}) => {
  const workflow = await workflows.management.getWorkflow(workflowId, spaceId);
  if (!workflow) {
    throw createBadRequestError(`Workflow '${workflowId}' not found`);
  }
};
