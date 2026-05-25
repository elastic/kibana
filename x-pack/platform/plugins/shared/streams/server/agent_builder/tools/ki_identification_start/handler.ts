/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { OnboardingStep } from '@kbn/streams-schema';
import { getStreamsLocation } from '../../../../common/get_streams_location/get_streams_location';
import type {
  OnboardingWorkflowClient,
  OnboardingWorkflowInputs,
} from '../../../lib/workflows/onboarding_workflow_client';

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

interface StartKiIdentificationHandlerParams {
  streamName: string;
  steps: OnboardingStep[];
  connectors?: {
    features?: string;
    queries?: string;
  };
  onboardingClient: OnboardingWorkflowClient;
  request: KibanaRequest;
}

interface StartKiIdentificationHandlerResult {
  kibanaPath: string;
}

export async function startKiIdentificationToolHandler({
  streamName,
  steps,
  connectors,
  onboardingClient,
  request,
}: StartKiIdentificationHandlerParams): Promise<StartKiIdentificationHandlerResult> {
  const now = Date.now();
  const skipFeatures = !steps.includes(OnboardingStep.FeaturesIdentification);
  const skipQueries = !steps.includes(OnboardingStep.QueriesGeneration);

  const inputs: OnboardingWorkflowInputs = {
    streamName,
    skipFeatures,
    skipQueries,
    featuresStart: now - DEFAULT_LOOKBACK_MS,
    featuresEnd: now,
    ...(connectors?.features && { featuresConnectorId: connectors.features }),
    ...(connectors?.queries && { queriesConnectorId: connectors.queries }),
  };

  await onboardingClient.run({ inputs, request });

  const location = getStreamsLocation({
    name: streamName,
    managementTab: 'significantEvents',
  });

  return {
    kibanaPath: `/app/${location.app}${location.path}`,
  };
}
