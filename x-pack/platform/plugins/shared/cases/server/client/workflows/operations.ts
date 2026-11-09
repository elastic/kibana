/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertIndexClaim } from '../../common/types';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import {
  ensureAuthorizedToRunWorkflow,
  type EnsureAuthorizedToRunWorkflowParams,
} from '../cases/ensure_authorized_to_run_workflow';
import {
  preflightWorkflowExecution,
  recordWorkflowExecution,
  type PreflightWorkflowExecutionArgs,
  type RecordWorkflowExecutionArgs,
} from '../user_actions/record_workflow_execution';

export interface CasesWorkflowOperations {
  ensureAuthorizedToRunWorkflow: (
    params: EnsureAuthorizedToRunWorkflowParams
  ) => Promise<Array<{ id: string; owner: string }>>;
  preflightWorkflowExecution: (params: PreflightWorkflowExecutionArgs) => Promise<void>;
  /** `entities` must come from a prior `ensureAuthorizedToRunWorkflow` call. */
  recordWorkflowExecution: (params: RecordWorkflowExecutionArgs) => Promise<void>;
  /** Reads as the caller, so claims on alerts the caller cannot read are left out of the result. */
  confirmAlertIndices: (params: { claims: AlertIndexClaim[] }) => Promise<AlertIndexClaim[]>;
}

export interface CasesWorkflowRunContext {
  casesClient: CasesClient;
  workflowOperations: CasesWorkflowOperations;
}

/** Binds internal workflow operations to the current request-scoped Cases client dependencies. */
export const createCasesWorkflowOperations = (
  clientArgs: CasesClientArgs
): CasesWorkflowOperations => ({
  ensureAuthorizedToRunWorkflow: (params) => ensureAuthorizedToRunWorkflow(params, clientArgs),
  preflightWorkflowExecution: (params) => preflightWorkflowExecution(params, clientArgs),
  recordWorkflowExecution: (params) => recordWorkflowExecution(params, clientArgs),
  confirmAlertIndices: (params) => clientArgs.services.alertsService.confirmAlertIndices(params),
});
