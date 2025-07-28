/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalServiceApiHandlerArgs, WorkflowsExecutorResultData } from './types';

const run = async ({
  externalService,
  params,
}: ExternalServiceApiHandlerArgs): Promise<WorkflowsExecutorResultData> => {
  const { workflowId, inputs } = params;
  const res = await externalService.runWorkflow({ workflowId, inputs });
  return { workflowRunId: res.workflowRunId, status: res.status };
};

export const api = {
  run,
} as const;
