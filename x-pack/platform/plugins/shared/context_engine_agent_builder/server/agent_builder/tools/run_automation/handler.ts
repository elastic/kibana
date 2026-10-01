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
import { ExecutionStatus, isTerminalStatus, type WorkflowDetailDto } from '@kbn/workflows';
import { CREATE_KI_STEP_ID } from '@kbn/context-engine-plugin/common/step_types/create_ki';
import { runSavedAutomation, type RunAutomationResult } from '../save_automation/handler';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';

export type { RunAutomationResult };

export const PILOT_SIZE_INPUT = 'pilot_size';

// Long enough for a pilot of ten model calls; a slower pilot returns its execution id to poll.
const PILOT_COMPLETION_TIMEOUT_SEC = 180;

export interface RunAutomationParams {
  workflowId: string;
  pilotSize?: number;
}

export interface RunAutomationHandlerResult extends RunAutomationResult {
  /** Items the run was limited to, present for a pilot. */
  pilotSize?: number;
  /** KIs the run wrote, present when the call waited and the run completed. */
  kisWritten?: number;
  /** Deep link to the workflow execution in the Workflows app, when the run started. */
  workflowUrl?: string;
  /** Canned instruction for the agent to tell the user how to check execution progress. */
  statusCheckHint?: string;
}

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

const declaresPilotInput = (workflow: WorkflowDetailDto | null | undefined): boolean =>
  (workflow?.definition?.triggers ?? []).some(
    (trigger) =>
      trigger.type === 'manual' &&
      trigger.inputs !== undefined &&
      !Array.isArray(trigger.inputs) &&
      trigger.inputs.properties?.[PILOT_SIZE_INPUT] !== undefined
  );

/**
 * KIs a finished run wrote: completed createKi steps that returned an id. A KI that fails
 * verification also completes its step, but with no id, because nothing was written.
 */
const countKisWritten = async ({
  workflowsManagement,
  executionId,
  spaceId,
  request,
  logger,
}: {
  workflowsManagement: WorkflowsManagementApi;
  executionId: string;
  spaceId: string;
  request: KibanaRequest;
  logger: Logger;
}): Promise<number | undefined> => {
  try {
    const execution = await workflowsManagement.getWorkflowExecution(executionId, spaceId, {
      includeOutput: true,
      request,
    });
    return execution?.stepExecutions.filter(
      ({ stepType, status, output }) =>
        stepType === CREATE_KI_STEP_ID &&
        status === ExecutionStatus.COMPLETED &&
        typeof output === 'object' &&
        output !== null &&
        !Array.isArray(output) &&
        typeof output.id === 'string'
    ).length;
  } catch (error) {
    logger.warn(`Could not count the KIs written by execution '${executionId}': ${error}`);
    return undefined;
  }
};

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
  const { workflowId, pilotSize } = params;

  // A workflow without the input would ignore it and run over the full corpus.
  if (pilotSize !== undefined) {
    const workflow = await workflowsManagement.getWorkflow(workflowId, spaceId, request);
    if (!workflow) {
      return {
        started: false,
        reason: `Workflow '${workflowId}' was not found in this space.`,
      };
    }
    if (!declaresPilotInput(workflow)) {
      return {
        started: false,
        reason:
          `Workflow '${workflowId}' does not declare the ${PILOT_SIZE_INPUT} input, so it cannot ` +
          `run as a pilot. Only document_orchestration or unit_profile automations can; one ` +
          `installed before pilot mode existed gains it when reinstalled with the same name.`,
      };
    }
  }

  const runResult = await runSavedAutomation({
    workflowId,
    spaceId,
    request,
    workflowsManagement,
    getSecurityStart,
    logger,
    ...(pilotSize !== undefined && {
      inputs: { [PILOT_SIZE_INPUT]: pilotSize },
      completionTimeoutSec: PILOT_COMPLETION_TIMEOUT_SEC,
    }),
  });

  const serverBasePath = (await getCoreStart()).http.basePath.serverBasePath;
  const spaceSegment = spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '';
  const workflowBaseUrl = `${serverBasePath}${spaceSegment}/app/workflows/${encodeURIComponent(
    workflowId
  )}`;

  if (!runResult.started) {
    return runResult;
  }

  const workflowUrl = `${workflowBaseUrl}?tab=executions&executionId=${encodeURIComponent(
    runResult.executionId ?? ''
  )}`;
  const finished = runResult.status !== undefined && isTerminalStatus(runResult.status);
  const kisWritten =
    runResult.status === ExecutionStatus.COMPLETED && runResult.executionId
      ? await countKisWritten({
          workflowsManagement,
          executionId: runResult.executionId,
          spaceId,
          request,
          logger,
        })
      : undefined;

  return {
    ...runResult,
    ...(pilotSize !== undefined && { pilotSize }),
    ...(kisWritten !== undefined && { kisWritten }),
    workflowUrl,
    ...(!finished && {
      statusCheckHint: `Use platform.core.get_workflow_execution_status with executionId "${runResult.executionId}" to check progress. The user can ask you for a status update at any time.`,
    }),
  };
};

export const getRunAutomationErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred while running the workflow automation.';
};
