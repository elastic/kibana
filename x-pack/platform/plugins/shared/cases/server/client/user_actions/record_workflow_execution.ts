/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createCaseError, isSOError } from '../../common/error';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import type { WorkflowOrigin, WorkflowPayload } from '../../../common/types/domain';
import type { CasesClientArgs } from '../types';
import { WORKFLOW_RUN_AUTHZ_OPERATION } from '../cases/ensure_authorized_to_run_workflow';
import { MAX_USER_ACTIONS_PER_CASE } from '../../../common/constants';

export interface PreflightWorkflowExecutionArgs {
  caseIds: string[];
}

export interface RecordWorkflowExecutionArgs {
  caseIds: string[];
  workflow: WorkflowPayload;
  origin?: WorkflowOrigin;
  /**
   * Pre-fetched and pre-authorized entities from `ensureAuthorizedToRunWorkflow`. When provided
   * the function skips the redundant `getCases` + `ensureAuthorized` round-trips.
   */
  entities?: Array<{ id: string; owner: string }>;
}

/**
 * Validates that recording the workflow execution would not exceed the per-case user-action limit
 * for any of the requested cases. Must be called before starting the workflow execution so a
 * rejection happens before anything irreversible.
 */
export const preflightWorkflowExecution = async (
  { caseIds }: PreflightWorkflowExecutionArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    logger,
    services: { userActionService },
  } = clientArgs;

  try {
    const totals = await userActionService.getMultipleCasesUserActionsTotal({ caseIds });

    for (const caseId of caseIds) {
      const total = totals[caseId] ?? 0;
      if (total + 1 > MAX_USER_ACTIONS_PER_CASE) {
        throw Boom.badRequest(
          `The case with id ${caseId} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
        );
      }
    }
  } catch (error) {
    throw createCaseError({
      message: `Failed to preflight workflow execution for cases [${caseIds.join(', ')}]: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Records a workflow execution user action in the case activity log for each requested case.
 *
 * Pass `entities` (from `ensureAuthorizedToRunWorkflow`) to skip the redundant `getCases` and
 * `ensureAuthorized` round-trips — authorization is all-or-nothing and has already run. When
 * `entities` is absent the function fetches and re-authorizes itself so the function remains safe
 * to call from any context.
 */
export const recordWorkflowExecution = async (
  { caseIds, workflow, origin, entities: preAuthorizedEntities }: RecordWorkflowExecutionArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    logger,
    user,
    authorization,
    services: { caseService, userActionService },
  } = clientArgs;

  try {
    let entities: Array<{ id: string; owner: string }>;

    if (preAuthorizedEntities) {
      // Reuse the entities already fetched and authorized by ensureAuthorizedToRunWorkflow to
      // avoid a second getCases + ensureAuthorized round-trip for the same cases.
      entities = preAuthorizedEntities;
    } else {
      // Fallback: fetch and authorize when called without pre-authorized entities.
      const { saved_objects: cases } = await caseService.getCases({ caseIds });

      entities = cases
        .filter((c) => !isSOError(c))
        .map((c) => ({
          id: c.id,
          owner: (c as Exclude<typeof c, { error: unknown }>).attributes.owner,
        }));

      // All-or-nothing authorization: one privilege round-trip across all owners.
      // Use the workflow-specific access operation so the audit log emits an 'access'
      // event rather than a 'change' event.
      await authorization.ensureAuthorized({
        operation: WORKFLOW_RUN_AUTHZ_OPERATION,
        entities,
      });
    }

    // Build one user action per case in a single bulk write.
    const userActions = entities.map(({ id: caseId, owner }) => ({
      type: UserActionTypes.workflow,
      action: UserActionActions.create,
      caseId,
      owner,
      user,
      payload: { workflow, origin },
    }));

    await userActionService.creator.bulkCreateUserAction({
      userActions,
      // wait_for ensures the activity rows are visible to the next find the client issues
      // right after the run mutation resolves.
      refresh: 'wait_for',
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to record workflow execution for cases [${caseIds.join(', ')}]: ${error}`,
      error,
      logger,
    });
  }
};
