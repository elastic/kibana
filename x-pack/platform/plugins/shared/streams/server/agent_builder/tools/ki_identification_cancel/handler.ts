/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_KI_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  WorkflowExecutionClient,
  type WorkflowsManagementApi,
} from '../../../lib/workflows/workflow_execution_client';

interface CancelKiIdentificationHandlerParams {
  stream_name: string;
  workflowsManagementApi: WorkflowsManagementApi;
}

interface CancelKiIdentificationHandlerResult {
  stream_name: string;
  status: 'cancelled';
}

export async function cancelKiIdentificationToolHandler({
  stream_name: streamName,
  workflowsManagementApi,
}: CancelKiIdentificationHandlerParams): Promise<CancelKiIdentificationHandlerResult> {
  const client = new WorkflowExecutionClient(
    workflowsManagementApi,
    STREAMS_KI_ONBOARDING_WORKFLOW_ID
  );

  await client.cancelExecution(streamName);

  return {
    stream_name: streamName,
    status: 'cancelled',
  };
}
