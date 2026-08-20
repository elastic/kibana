/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { RunCaseWorkflowRequest, RunCaseWorkflowResponse } from '../../../common/types/api';
import { getCaseWorkflowRunUrl } from '../../../common/api';

export const runCaseWorkflow = async ({
  http,
  caseId,
  workflowId,
  body,
}: {
  http: HttpStart;
  caseId: string;
  workflowId: string;
  body: RunCaseWorkflowRequest;
}): Promise<RunCaseWorkflowResponse> =>
  http.post<RunCaseWorkflowResponse>(getCaseWorkflowRunUrl(caseId, workflowId), {
    body: JSON.stringify(body),
  });
