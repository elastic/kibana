/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { generateStreamDescription } from './src/sig_events/description/generate_description';
export {
  identifySystems,
  type IdentifySystemsOptions,
  type IdentifySystemsResult,
} from './src/sig_events/systems/identify_systems';
export { partitionStream } from './src/stream_management/partition_stream';
export {
  suggestProcessingPipeline,
  type SuggestProcessingPipelineResult,
} from './src/stream_management/suggest_processing_pipeline';
export { generateSignificantEvents } from './src/sig_events/significant_events/generate_significant_events';
export {
  createDefaultSignificantEventsToolUsage,
  type SignificantEventsToolUsage,
} from './src/sig_events/significant_events/tools/tool_usage';
export { sumTokens } from './src/helpers/sum_tokens';
export {
  identifyFeatures,
  type IdentifyFeaturesOptions,
} from './src/sig_events/features/identify_features';
export { generateAllComputedFeatures } from './src/sig_events/features/computed';
