/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';

export type WorkflowApi = WorkflowsServerPluginSetup['management'];

/**
 * Fetches an execution of the onboarding workflow, or undefined when it does not exist or
 * belongs to another workflow, so callers cannot read other workflows' runs.
 */
export const findOnboardingExecution = async ({
  workflowApi,
  executionId,
  spaceId,
  request,
  includeOutput,
}: {
  workflowApi: WorkflowApi;
  executionId: string;
  spaceId: string;
  request: KibanaRequest;
  includeOutput?: boolean;
}): Promise<WorkflowExecutionDto | undefined> => {
  const execution = await workflowApi.getWorkflowExecution(executionId, spaceId, {
    ...(includeOutput ? { includeOutput } : {}),
    request,
  });
  if (!execution || execution.workflowId !== FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID) {
    return undefined;
  }
  return execution;
};
