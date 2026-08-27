/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { WriteOperations } from '../../authorization';
import type { OperationDetails } from '../../authorization';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { createCaseError, createCaseErrorFromSOError, isSOError } from '../../common/error';
import type { CasesClientArgs } from '../types';

/**
 * Authorization operation for running a workflow from a case.
 *
 * The privilege name (`updateCase`) is intentionally reused from `Operations.updateCase` so that
 * the same `cases:<owner>/updateCase` privilege controls access — keeping the privilege model
 * consistent with the existing Cases write-access requirement. Only the audit fields are overridden
 * to emit `case_workflow_run_authz` (an access event) rather than the misleading `case_update`
 * (a change event) that `Operations.updateCase` produces.
 */
export const WORKFLOW_RUN_AUTHZ_OPERATION: OperationDetails = {
  ecsType: 'access',
  name: WriteOperations.UpdateCase,
  action: 'case_workflow_run_authz',
  verbs: {
    present: 'run workflow on',
    progressive: 'running workflow on',
    past: 'ran workflow on',
  },
  docType: 'case',
  savedObjectType: CASE_SAVED_OBJECT,
};

export interface EnsureAuthorizedToRunWorkflowParams {
  ids: string[];
}

export interface AuthorizedCase {
  id: string;
  owner: string;
}

/**
 * Authorizes the caller to run a workflow against all the given case IDs.
 *
 * The check is all-or-nothing: if the caller lacks `cases:<owner>/updateCase` on *any* of the
 * requested cases, a 403 is thrown and no execution is started. The deliberate ordering mirrors
 * `delete.ts`/`bulk_update.ts`: authorization runs before not-found errors are surfaced so an
 * unauthorized caller cannot learn which IDs exist.
 */
export const ensureAuthorizedToRunWorkflow = async (
  { ids }: EnsureAuthorizedToRunWorkflowParams,
  clientArgs: CasesClientArgs
): Promise<AuthorizedCase[]> => {
  const {
    authorization,
    logger,
    services: { caseService },
  } = clientArgs;

  try {
    const { saved_objects: cases } = await caseService.getCases({ caseIds: ids });

    // Authorize before reporting not-found errors so an unauthorized caller
    // cannot distinguish "this case doesn't exist" from "you can't see it".
    const entities = cases
      .filter((c) => !isSOError(c))
      .map((c) => ({
        id: c.id,
        owner: (c as Exclude<typeof c, { error: unknown }>).attributes.owner,
      }));

    if (entities.length === 0) {
      // ensureAuthorized({ entities: [] }) passes vacuously because it derives an empty
      // privilege set from zero owners. Reject explicitly so an unauthorized caller never
      // receives a 404 that would reveal which case ids do not exist.
      throw Boom.forbidden('Unauthorized to run workflow on case');
    }

    // One privilege round-trip covers all owners; throws Boom.forbidden if any is unauthorized.
    await authorization.ensureAuthorized({
      operation: WORKFLOW_RUN_AUTHZ_OPERATION,
      entities,
    });

    // Only after authorization: surface any SO-level errors (not-found, etc.).
    for (const theCase of cases) {
      if (isSOError(theCase)) {
        throw createCaseErrorFromSOError(
          theCase.error,
          `Failed to authorize workflow run for case ids: ${ids.join(', ')}`
        );
      }
    }

    return entities;
  } catch (error) {
    throw createCaseError({
      message: `Failed to authorize workflow run for case ids: ${ids.join(', ')}: ${error}`,
      error,
      logger,
    });
  }
};
