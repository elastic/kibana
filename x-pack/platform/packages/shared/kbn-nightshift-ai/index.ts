/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { AnalysisTarget } from './src/shared/analysis_target';
export { getDiverseSampleDocuments } from './src/shared/sampling/get_diverse_sample_documents';
export { EMPTY_TOKENS, sumTokens } from './src/shared/tokens/sum_tokens';
export {
  identifyKIQueries,
  DEFAULT_MAX_EXISTING_QUERIES_FOR_CONTEXT,
  type ExistingQuerySummary,
  type QueryAttempt,
  type QueryAttemptStatus,
  type QueryAttemptFailureReason,
} from './src/significant_events/queries/identify_ki_queries';
export {
  createDefaultSignificantEventsToolUsage,
  type SignificantEventsToolUsage,
} from './src/significant_events/queries/tools/tool_usage';
export { QUERY_GENERATION_EXCLUDED_FEATURE_TYPES } from './src/significant_events/queries/tools/features_tool';
export { significantEventsPrompt } from './src/significant_events/queries/prompt';
export {
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
  type SignificantEventType,
} from './src/significant_events/queries/types';
export {
  identifyFeatures,
  toPreviouslyIdentifiedFeature,
  type IdentifyFeaturesOptions,
  type PreviouslyIdentifiedFeature,
  type ExcludedFeatureSummary,
  type IgnoredFeature,
  type SearchSimilarFeaturesArguments,
  type SimilarFeatureHit,
} from './src/significant_events/features/identify_features';
export { featuresPrompt } from './src/significant_events/features/prompt';
export {
  createGetStreamFeaturesTool,
  createGetFeatureQueryFromToolArgs,
  resolveFeatureTypeFilters,
  toFeatureForLlmContext,
} from './src/significant_events/features/tool';
export {
  formatRawDocument,
  DEFAULT_INFERENCE_DOCUMENT_LIMITS,
  type InferenceDocument,
  type InferenceDocumentLimits,
} from './src/significant_events/features/utils/format_raw_document';
export {
  generateAllComputedFeatures,
  DEFAULT_COMPUTED_FEATURES_TIMEOUT_MS,
  type ComputedFeatureGenerationResult,
  type GenerateAllComputedFeaturesOptions,
} from './src/significant_events/features/computed';
export {
  CODE_ANALYSIS_PROVIDER_KEY,
  codeAnalysisGenerator,
} from './src/significant_events/features/computed/code_analysis';
export type {
  ComputedFeatureProvider,
  ComputedFeatureGeneratorOptions,
} from './src/significant_events/features/computed/types';
export { selectLogPatternsForLlm } from './src/significant_events/features/computed/log_patterns';
export { pickErrorLogFields } from './src/significant_events/features/computed/error_logs';
export {
  searchKnowledgeIndicators,
  DEFAULT_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE,
} from './src/significant_events/knowledge_indicators/search';
export {
  featureToKnowledgeIndicatorFeature,
  queryLinkToKnowledgeIndicatorQuery,
} from './src/significant_events/knowledge_indicators/mappers';
export type {
  SearchKnowledgeIndicatorsInput,
  SearchKnowledgeIndicatorsKind,
  SearchKnowledgeIndicatorsOutput,
  KnowledgeIndicator,
  KnowledgeIndicatorFeature,
  KnowledgeIndicatorQuery,
} from './src/significant_events/knowledge_indicators/types';
