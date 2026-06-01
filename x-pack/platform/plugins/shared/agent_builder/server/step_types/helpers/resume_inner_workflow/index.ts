/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';

export const resumeInnerWorkflow = async ({
  request,
  resumeInput,
  spaceId,
  stepState,
  workflowApi,
}: {
  request: KibanaRequest;
  resumeInput: Record<string, unknown>;
  spaceId: string;
  stepState: Record<string, unknown>;
  workflowApi: WorkflowsManagementApi | undefined;
}): Promise<{ savedConversationId: string | undefined }> => {
  const savedConversationId =
    typeof stepState.conversationId === 'string' ? stepState.conversationId : undefined;
  const innerExecutionId =
    typeof stepState.innerExecutionId === 'string' ? stepState.innerExecutionId : undefined;
  const innerResumeSeq =
    typeof stepState.innerResumeSeq === 'number' ? stepState.innerResumeSeq : undefined;

  if (workflowApi && innerExecutionId) {
    const resumeOptions =
      innerResumeSeq !== undefined ? { expectedResumeSeq: innerResumeSeq + 1 } : undefined;
    if (resumeOptions !== undefined) {
      await workflowApi.resumeWorkflowExecution(
        innerExecutionId,
        spaceId,
        resumeInput,
        request,
        resumeOptions
      );
    } else {
      await workflowApi.resumeWorkflowExecution(innerExecutionId, spaceId, resumeInput, request);
    }
  }

  return { savedConversationId };
};
