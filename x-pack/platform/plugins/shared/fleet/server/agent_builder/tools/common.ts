/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { errorResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { ToolHandlerResult } from '@kbn/agent-builder-server/tools';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';

import { getAuthzFromRequest } from '../../services/security/security';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

export type WorkflowApi = WorkflowsServerPluginSetup['management'];

export interface AwsOnboardingToolDeps {
  workflowApi: WorkflowApi;
}

/**
 * Returns an error result when the feature is off or the user lacks the required Fleet
 * privilege, and undefined when the call may proceed.
 */
export const checkOnboardingAccess = async (
  request: KibanaRequest,
  access: 'read' | 'write'
): Promise<ToolHandlerResult | undefined> => {
  if (!(await isAgenticAwsOnboardingEnabled())) {
    return errorResult('Agent-driven AWS onboarding is not enabled.');
  }
  const authz = await getAuthzFromRequest(request);
  const allowed =
    access === 'write'
      ? authz.integrations.writeIntegrationPolicies
      : authz.integrations.readIntegrationPolicies;
  if (!allowed) {
    return errorResult(
      access === 'write'
        ? 'You need write access to Fleet integration policies to onboard AWS services.'
        : 'You need read access to Fleet integration policies to view AWS onboarding progress.'
    );
  }
  return undefined;
};

/**
 * Fetches an execution and returns an error result unless it exists and belongs to the
 * onboarding workflow, so these tools cannot read or resume other workflows' runs.
 */
export const getOnboardingExecution = async ({
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
}): Promise<{ execution: WorkflowExecutionDto } | { error: ToolHandlerResult }> => {
  const execution = await workflowApi.getWorkflowExecution(executionId, spaceId, {
    ...(includeOutput ? { includeOutput } : {}),
    request,
  });
  if (!execution || execution.workflowId !== FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID) {
    return { error: errorResult(`AWS onboarding execution '${executionId}' was not found.`) };
  }
  return { execution };
};
