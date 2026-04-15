/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ContinuousExtractionWorkflowInputs,
  FeaturesIdentificationWorkflowInputs,
} from '../../../common/constants';
import type { WorkflowClient } from './workflow_client';

export const ensureContinuousExtraction = async ({
  continuousExtractionWorkflowClient,
  enabled,
  request,
  featuresIdentificationWorkflowClient,
  logger,
}: {
  continuousExtractionWorkflowClient: WorkflowClient<ContinuousExtractionWorkflowInputs>;
  enabled: boolean;
  request: KibanaRequest;
  featuresIdentificationWorkflowClient?: WorkflowClient<FeaturesIdentificationWorkflowInputs>;
  logger?: Logger;
}): Promise<void> => {
  const log = logger?.get('continuous-ki-extraction');

  if (featuresIdentificationWorkflowClient) {
    await featuresIdentificationWorkflowClient
      .cancelAll()
      .catch((err) => log?.warn(`Failed to cancel running features workflow executions: ${err}`));
  }

  await continuousExtractionWorkflowClient.ensureEnabled(enabled, request);
};
