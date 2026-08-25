/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseError } from '../../common/error';
import { validateMaxUserActions } from '../../common/validators';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import type { WorkflowOrigin, WorkflowPayload } from '../../../common/types/domain';
import type { CasesClientArgs } from '../types';
import { WORKFLOW_RUN_AUTHZ_OPERATION } from '../cases/ensure_authorized_to_update';

export interface PreflightWorkflowExecutionArgs {
  caseId: string;
}

export interface RecordWorkflowExecutionArgs {
  caseId: string;
  workflow: WorkflowPayload;
  origin: WorkflowOrigin;
}

/**
 * Validates that recording the workflow execution would not exceed the per-case user-action limit.
 * Must be called before starting the workflow execution so a rejection happens before anything
 * irreversible.
 */
export const preflightWorkflowExecution = async (
  { caseId }: PreflightWorkflowExecutionArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    logger,
    services: { userActionService },
  } = clientArgs;

  try {
    await validateMaxUserActions({ caseId, userActionService, userActionsToAdd: 1 });
  } catch (error) {
    throw createCaseError({
      message: `Failed to preflight workflow execution for case ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Records a workflow execution user action in the case activity log.
 *
 * The case owner is fetched from the saved object so that authorization cannot be bypassed
 * by passing a forged owner — this method is exposed on the public UserActionsSubClient.
 */
export const recordWorkflowExecution = async (
  { caseId, workflow, origin }: RecordWorkflowExecutionArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    logger,
    user,
    authorization,
    services: { caseService, userActionService },
  } = clientArgs;

  try {
    // Fetch the case to obtain the authoritative owner — we never trust caller-supplied owner
    // because this function is exposed on the public UserActionsSubClient.
    const theCase = await caseService.getCase({ id: caseId });
    const owner = theCase.attributes.owner;

    // Use the workflow-specific access operation (not Operations.updateCase) so the audit log
    // emits an 'access' event rather than a 'change' event for workflow runs.
    await authorization.ensureAuthorized({
      operation: WORKFLOW_RUN_AUTHZ_OPERATION,
      entities: [{ id: caseId, owner }],
    });

    await userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.workflow,
        action: UserActionActions.create,
        caseId,
        owner,
        user,
        payload: { workflow, origin },
      },
      // wait_for ensures the activity row is visible to the next find that the client issues
      // right after the run mutation resolves.
      refresh: 'wait_for',
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to record workflow execution for case ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
