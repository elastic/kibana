/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { runSavedAutomation, type RunAutomationResult } from '../save_automation/handler';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';

export type { RunAutomationResult };

export interface RunAutomationParams {
  workflowId: string;
}

export interface RunAutomationHandlerResult extends RunAutomationResult {
  /** Deep link to the workflow execution in the Workflows app, when the run started. */
  workflowUrl?: string;
  /** Canned instruction for the agent to tell the user how to check execution progress. */
  statusCheckHint?: string;
}

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export const runAutomationHandler = async ({
  params,
  request,
  spaceId,
  logger,
  getCoreStart,
  getSecurityStart,
  getWorkflowsManagement,
}: {
  params: RunAutomationParams;
  request: KibanaRequest;
  spaceId: string;
  logger: Logger;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}): Promise<RunAutomationHandlerResult> => {
  await assertContextEngineWriteAccess({ request, spaceId, getCoreStart, getSecurityStart });

  const workflowsManagement = getWorkflowsManagement();

  const runResult = await runSavedAutomation({
    workflowId: params.workflowId,
    spaceId,
    request,
    workflowsManagement,
    getSecurityStart,
    logger,
  });

  const serverBasePath = (await getCoreStart()).http.basePath.serverBasePath;
  const spaceSegment = spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '';
  const workflowBaseUrl = `${serverBasePath}${spaceSegment}/app/workflows/${encodeURIComponent(
    params.workflowId
  )}`;

  if (!runResult.started) {
    return runResult;
  }

  const workflowUrl = `${workflowBaseUrl}?tab=executions&executionId=${encodeURIComponent(
    runResult.executionId ?? ''
  )}`;

  return {
    ...runResult,
    workflowUrl,
    statusCheckHint: `Use platform.core.get_workflow_execution_status with executionId "${runResult.executionId}" to check progress. The user can ask you for a status update at any time.`,
  };
};

export const getRunAutomationErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred while running the workflow automation.';
};
