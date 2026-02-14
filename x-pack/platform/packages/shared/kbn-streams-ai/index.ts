/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { generateStreamDescription } from './src/description/generate_description';
export {
  identifySystems,
  type IdentifySystemsOptions,
  type IdentifySystemsResult,
} from './src/systems/identify_systems';
export { partitionStream } from './workflows/partition_stream';
export { suggestProcessingPipeline } from './workflows/suggest_processing_pipeline';
export { generateSignificantEvents } from './src/significant_events/generate_significant_events';
export { sumTokens } from './src/helpers/sum_tokens';
export { identifyFeatures, type IdentifyFeaturesOptions } from './src/features/identify_features';
export { generateAllComputedFeatures } from './src/features/computed';
export {
  suggestDashboard,
  prepareDashboardSuggestionInput,
  getInputTypeFromDefinition,
  isQueryStreamDefinition,
  isIngestStreamDefinition,
  type DashboardSuggestionInput,
  type DashboardSuggestionResult,
  type DashboardSuggestionTaskResult,
  type DashboardSuggestionInputType,
  type DashboardSuggestionEngineOptions,
  type PrepareDashboardSuggestionInputOptions,
  type RawDashboard,
  type DashboardPanel,
  type ColumnMetadata,
  type PanelDimensions,
  type PanelPosition,
  type PanelType,
  type TimeRange,
  type DashboardFilter,
} from './workflows/dashboard_suggestions';
