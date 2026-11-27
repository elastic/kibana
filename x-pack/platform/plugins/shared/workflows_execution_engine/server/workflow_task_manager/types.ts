/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const WORKFLOW_RUN_TASK_TYPE = 'workflow:run';

export const WORKFLOW_RESUME_TASK_TYPE = 'workflow:resume';

export const WORKFLOW_SCHEDULED_TASK_TYPE = 'workflow:scheduled';

export interface StartWorkflowExecutionParams {
  workflowRunId: string;
  spaceId: string;
}

export interface ResumeWorkflowExecutionParams {
  workflowRunId: string;
  spaceId: string;
}
