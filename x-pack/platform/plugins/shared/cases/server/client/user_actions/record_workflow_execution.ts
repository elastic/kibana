/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { validateMaxUserActions } from '../../common/validators';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import type { WorkflowOrigin, WorkflowPayload } from '../../../common/types/domain';
import type { CasesClientArgs } from '../types';

export interface PreflightWorkflowExecutionArgs {
  caseId: string;
}

export interface RecordWorkflowExecutionArgs {
  caseId: string;
  /** The owner of the case — taken from the already-fetched case to avoid a second SO read. */
  owner: string;
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
 */
export const recordWorkflowExecution = async (
  { caseId, owner, workflow, origin }: RecordWorkflowExecutionArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    logger,
    user,
    authorization,
    services: { userActionService },
  } = clientArgs;

  try {
    // Defensive authorization — the execution API already authorized with ensureAuthorizedToUpdate
    // but we re-check here because this function is exposed on the cases client.
    await authorization.ensureAuthorized({
      operation: Operations.updateCase,
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
