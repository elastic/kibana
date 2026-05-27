/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { OnboardingStatus } from '@kbn/streams-schema';
import type { OnboardingWorkflowClient } from '../../../lib/workflows/onboarding_workflow_client';

interface CancelKiIdentificationHandlerParams {
  streamName: string;
  onboardingClient: OnboardingWorkflowClient;
  request: KibanaRequest;
}

interface CancelKiIdentificationHandlerResult {
  stream_name: string;
  execution_id: string | null;
  status: OnboardingStatus.Canceled;
}

export async function cancelKiIdentificationToolHandler({
  streamName,
  onboardingClient,
  request,
}: CancelKiIdentificationHandlerParams): Promise<CancelKiIdentificationHandlerResult> {
  const executionId = await onboardingClient.cancel({ streamName, request });

  return {
    stream_name: streamName,
    execution_id: executionId,
    status: OnboardingStatus.Canceled,
  };
}
