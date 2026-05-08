/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { OnboardingStep } from '@kbn/streams-schema';
import { STREAMS_KI_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import { getStreamsLocation } from '../../../../common/get_streams_location/get_streams_location';
import {
  WorkflowExecutionClient,
  type WorkflowsManagementApi,
} from '../../../lib/workflows/workflow_execution_client';

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

interface StartKiIdentificationHandlerParams {
  streamName: string;
  steps: OnboardingStep[];
  connectors?: {
    features?: string;
    queries?: string;
  };
  workflowsManagementApi: WorkflowsManagementApi;
  request: KibanaRequest;
}

interface StartKiIdentificationHandlerResult {
  kibanaPath: string;
}

export async function startKiIdentificationToolHandler({
  streamName,
  steps,
  connectors,
  workflowsManagementApi,
  request,
}: StartKiIdentificationHandlerParams): Promise<StartKiIdentificationHandlerResult> {
  const now = Date.now();

  const client = new WorkflowExecutionClient(
    workflowsManagementApi,
    STREAMS_KI_ONBOARDING_WORKFLOW_ID
  );

  const skipFeatures = !steps.includes('features_identification' as OnboardingStep);
  const skipQueries = !steps.includes('queries_generation' as OnboardingStep);

  await client.run(
    {
      streamName,
      featuresStart: now - DEFAULT_LOOKBACK_MS,
      featuresEnd: now,
      skipFeatures,
      skipQueries,
      ...(connectors?.features && { featuresConnectorId: connectors.features }),
      ...(connectors?.queries && { queriesConnectorId: connectors.queries }),
    },
    request
  );

  const location = getStreamsLocation({
    name: streamName,
    managementTab: 'significantEvents',
  });

  return {
    kibanaPath: `/app/${location.app}${location.path}`,
  };
}
