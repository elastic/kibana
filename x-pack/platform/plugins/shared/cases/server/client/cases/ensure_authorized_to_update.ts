/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WriteOperations } from '../../authorization';
import type { OperationDetails } from '../../authorization';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { createCaseError } from '../../common/error';
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

export interface EnsureAuthorizedToUpdateParams {
  id: string;
}

export const ensureAuthorizedToUpdate = async (
  { id }: EnsureAuthorizedToUpdateParams,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    authorization,
    logger,
    services: { caseService },
  } = clientArgs;

  try {
    const theCase = await caseService.getCase({ id });
    await authorization.ensureAuthorized({
      operation: WORKFLOW_RUN_AUTHZ_OPERATION,
      entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to authorize update for case id: ${id}: ${error}`,
      error,
      logger,
    });
  }
};
