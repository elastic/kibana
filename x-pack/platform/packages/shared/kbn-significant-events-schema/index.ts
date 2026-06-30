/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type EsqlQuery,
  esqlQuerySchema,
  type QueryType,
  QUERY_TYPE_MATCH,
  QUERY_TYPE_STATS,
  queryTypeSchema,
  type QueryFeature,
  queryFeatureSchema,
  type StreamQuery,
  type QueryLink,
  HIGH_SEVERITY_THRESHOLD,
  type QueriesGetResponse,
  type QueriesOccurrencesGetResponse,
  upsertStreamQueryRequestSchema,
  bulkStreamQueryInputSchema,
  streamQuerySchema,
} from './src/queries';

export type {
  SignificantEventsResponse,
  SignificantEventsGetResponse,
  GeneratedSignificantEventQuery,
  SignificantEventsQueriesGenerationResult,
  SignificantEventsQueriesGenerationTaskResult,
  LifecycleDetection,
  EventLifecycleResponse,
} from './src/api/significant_events';
export { generatedSignificantEventQuerySchema } from './src/api/significant_events';

export {
  type Feature,
  type FeatureUpsert,
  type FeatureWithFilter,
  type BaseFeature,
  type IdentifiedFeature,
  type IgnoredFeature,
  DATASET_ANALYSIS_FEATURE_TYPE,
  LOG_SAMPLES_FEATURE_TYPE,
  LOG_PATTERNS_FEATURE_TYPE,
  ERROR_LOGS_FEATURE_TYPE,
  CODE_ANALYSIS_FEATURE_TYPE,
  COMPUTED_FEATURE_TYPES,
  INFERRED_FEATURE_TYPES,
  isFeature,
  isFeatureWithFilter,
  isComputedFeature,
  isDuplicateFeature,
  hasSameFingerprint,
  computeFeatureUuid,
  normalizeFeatureSlug,
  mergeFeature,
  toBaseFeature,
  featureSchema,
  featureUpsertSchema,
  baseFeatureSchema,
  identifiedFeatureSchema,
  ignoredFeatureSchema,
} from './src/feature';

export { FeatureAccumulator } from './src/feature_accumulator';

export type { IdentifyFeaturesResult, IterationResult } from './src/api/features';
export { tokenCountSchema, iterationResultSchema } from './src/api/features';

export {
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  detectionSchema,
  type Detection,
  discoverySchema,
  type Discovery,
  significantEventSchema,
  significantEventStatusSchema,
  type SignificantEvent,
  type KnowledgeIndicator,
  type SignificantEventStatus,
} from './src/significant_events';

export type {
  StreamsKIsOnboardingResult,
  StreamsKIsOnboardingFeaturesResult,
  StreamsKIsOnboardingQueriesResult,
  StreamsKIsOnboardingStatusResult,
} from './src/onboarding';
export {
  StreamsKIsOnboardingStep,
  STREAMS_KIS_ONBOARDING_IN_PROGRESS_STATUSES,
} from './src/onboarding';

export type { SignificantEventsWorkflowStatusResult } from './src/workflows';
export { SignificantEventsWorkflowStatus } from './src/workflows';

export {
  STREAMS_SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
  STREAMS_SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  STREAMS_SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  STREAMS_SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  STREAMS_SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
} from './src/inference_feature_ids';
