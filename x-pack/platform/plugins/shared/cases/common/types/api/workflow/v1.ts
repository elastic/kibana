/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseWorkflowRunOriginType } from '../../domain/user_action/workflow/constants';

export interface CaseWorkflowRunOrigin {
  type: CaseWorkflowRunOriginType;
  id: string;
}

export interface RunCaseWorkflowRequest {
  inputs: Record<string, unknown>;
  origin: CaseWorkflowRunOrigin;
}

export interface RunCaseWorkflowResponse {
  workflowExecutionId: string;
  activityStatus: 'succeeded' | 'failed';
}
