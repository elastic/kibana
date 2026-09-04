/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { WriteOperations } from '../../authorization';
import type { OperationDetails } from '../../authorization';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { createCaseError, isSOError } from '../../common/error';
import type { Authorization } from '../../authorization/authorization';
import type { CasesService } from '../../services/cases';

/**
 * Authorization operation for running a workflow from a case.
 *
 * The privilege name (`updateCase`) is intentionally reused from `Operations.updateCase` so that
 * the same `cases:<owner>/updateCase` privilege controls access — keeping the privilege model
 * consistent with the existing Cases write-access requirement. Only the audit fields are overridden
 * to emit `case_workflow_run_authz` (an access event) rather than the misleading `case_update`
 * (a change event) that `Operations.updateCase` produces.
 */
const WORKFLOW_RUN_AUTHZ_OPERATION: OperationDetails = {
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

export interface WorkflowRunAuthorizationDeps {
  authorization: PublicMethodsOf<Authorization>;
  caseService: Pick<CasesService, 'getCases'>;
  logger: Logger;
}

/**
 * Authorizes the caller to run a workflow against all the given case IDs.
 *
 * The check is all-or-nothing: if the caller lacks `cases:<owner>/updateCase` on *any* of the
 * requested cases, a 403 is thrown and no execution is started.
 *
 * Critically, SO errors (not-found, etc.) are never surfaced as 404s. A 404 on a subset of ids
 * would let an unauthorized caller enumerate which ids exist across owners by toggling the
 * response code. Instead, any SO error in the batch is treated as another 403 — the caller
 * cannot distinguish "id does not exist" from "you can't see it".
 */
export const ensureAuthorizedToRunWorkflow = async (
  { ids }: EnsureAuthorizedToRunWorkflowParams,
  { authorization, caseService, logger }: WorkflowRunAuthorizationDeps
): Promise<void> => {
  try {
    const { saved_objects: cases } = await caseService.getCases({ caseIds: ids });

    // Single pass: collect authorized entities and detect any SO error (not-found, etc.).
    // Any error in the batch → 403 for the whole request. Surfacing a 404 would let an
    // unprivileged caller enumerate which case ids exist across owners they cannot read.
    const entities: Array<{ id: string; owner: string }> = [];
    let hasMissingCases = false;
    for (const c of cases) {
      if (isSOError(c)) {
        hasMissingCases = true;
      } else {
        entities.push({ id: c.id, owner: c.attributes.owner });
      }
    }

    // entities.length === 0 is defence-in-depth for non-route callers; the route already
    // enforces minSize: 1 on caseIds, so this branch is unreachable from the route.
    // ensureAuthorized({ entities: [] }) would pass vacuously — reject explicitly instead.
    if (entities.length === 0 || hasMissingCases) {
      throw Boom.forbidden('Unauthorized to run workflow on case');
    }

    // One privilege round-trip covers all owners; throws Boom.forbidden if any is unauthorized.
    await authorization.ensureAuthorized({
      operation: WORKFLOW_RUN_AUTHZ_OPERATION,
      entities,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to authorize workflow run for case ids: ${ids.join(', ')}: ${error}`,
      error,
      logger,
    });
  }
};
