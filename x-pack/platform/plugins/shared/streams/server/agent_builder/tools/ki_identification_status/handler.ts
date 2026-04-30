/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WorkflowExecutionClient,
  type WorkflowsManagementApi,
  type WorkflowExecutionResult,
} from '../../../lib/workflows/workflow_execution_client';
import { KI_ONBOARDING_WORKFLOW_UUID } from '../../../../common/constants';

interface GetKiIdentificationStatusHandlerParams {
  streamName: string;
  workflowsManagementApi: WorkflowsManagementApi;
}

export async function getKiIdentificationStatusToolHandler({
  streamName,
  workflowsManagementApi,
}: GetKiIdentificationStatusHandlerParams): Promise<
  WorkflowExecutionResult & { stream_name: string }
> {
  const client = new WorkflowExecutionClient(workflowsManagementApi, KI_ONBOARDING_WORKFLOW_UUID);
  const execution = await client.getLatestExecution(streamName);

  return {
    stream_name: streamName,
    ...execution,
  };
}
