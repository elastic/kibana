/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CaseUserActionsDeprecatedResponse,
  CaseUserActionStatsResponse,
  GetCaseConnectorsResponse,
  GetCaseUsersResponse,
  UserActionFindResponse,
} from '../../../common/types/api';
import type { CasesClientArgs } from '../types';
import { get } from './get';
import { getConnectors } from './connectors';
import { getStats } from './stats';
import { getUsers } from './users';
import type { GetConnectorsRequest, UserActionFind, UserActionGet, GetUsersRequest } from './types';
import { find } from './find';
import type { CasesClient } from '../client';
import {
  preflightWorkflowExecution,
  recordWorkflowExecution,
} from './record_workflow_execution';
import type {
  PreflightWorkflowExecutionArgs,
  RecordWorkflowExecutionArgs,
} from './record_workflow_execution';

/**
 * API for interacting the actions performed by a user when interacting with the cases entities.
 */
export interface UserActionsSubClient {
  find(params: UserActionFind): Promise<UserActionFindResponse>;
  /**
   * Retrieves all user actions for a particular case.
   */
  getAll(params: UserActionGet): Promise<CaseUserActionsDeprecatedResponse>;
  /**
   * Retrieves all the connectors used within a given case
   */
  getConnectors(params: GetConnectorsRequest): Promise<GetCaseConnectorsResponse>;
  /**
   * Retrieves the total of comments and user actions in a given case
   */
  stats(params: UserActionGet): Promise<CaseUserActionStatsResponse>;
  /**
   * Retrieves all users participating in a case
   */
  getUsers(params: GetUsersRequest): Promise<GetCaseUsersResponse>;
  /**
   * Validates that recording a workflow execution would not exceed the per-case user-action limit.
   * Call this before starting a workflow execution so the limit is checked before anything
   * irreversible.
   */
  preflightWorkflowExecution(params: PreflightWorkflowExecutionArgs): Promise<void>;
  /**
   * Records a workflow execution in the case activity log. Should be called immediately after
   * the execution starts; a failure here must not be reported as an execution failure.
   */
  recordWorkflowExecution(params: RecordWorkflowExecutionArgs): Promise<void>;
}

/**
 * Creates an API object for interacting with the user action entities
 */
export const createUserActionsSubClient = (
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): UserActionsSubClient => {
  const attachmentSubClient: UserActionsSubClient = {
    find: (params) => find(params, casesClient, clientArgs),
    getAll: (params) => get(params, clientArgs),
    getConnectors: (params) => getConnectors(params, clientArgs),
    stats: (params) => getStats(params, casesClient, clientArgs),
    getUsers: (params) => getUsers(params, casesClient, clientArgs),
    preflightWorkflowExecution: (params) => preflightWorkflowExecution(params, clientArgs),
    recordWorkflowExecution: (params) => recordWorkflowExecution(params, clientArgs),
  };

  return Object.freeze(attachmentSubClient);
};
