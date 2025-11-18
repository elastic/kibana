/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { generateStreamDescription } from './src/description/generate_description';
export {
  identifySystemFeatures,
  type IdentifyFeaturesOptions,
} from './src/features/identify_features';

export { generateSignificantEvents } from './src/significant_events/generate_significant_events';

export { partitionStreamWorkflow } from './src/workflows/partition_stream/partition_stream_workflow';
export { partitionStream } from './src/workflows/partition_stream/partition_streams';

export {
  generateNaturalLanguageQueriesWorkflow,
  onboardAnomalyDetectionJobsWorkflow,
  onboardDashboardsWorkflow,
  onboardFieldDefinitionsWorkflow,
  onboardProcessingWorkflow,
  onboardRulesWorkflow,
  onboardSLOsWorkflow,
} from './src/workflows/onboarding/onboarding_workflows';

export { onboardStreamWorkflow } from './src/workflows/onboarding/onboard_stream_workflow';

export { analyzeStream } from './src/workflows/analyze';

export type { ProcessingService } from './src/workflows/onboarding/processing/types';
