/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type EsqlQuery,
  type QueriesGetResponse,
  type QueriesOccurrencesGetResponse,
  type QueryFeature,
  type QueryLink,
  type QueryType,
  type StreamQuery,
  CRITICAL_SEVERITY_THRESHOLD,
  HIGH_SEVERITY_THRESHOLD,
  QUERY_TYPE_MATCH,
  QUERY_TYPE_STATS,
  bulkStreamQueryInputSchema,
  esqlQuerySchema,
  isExpirable,
  isExpired,
  queryFeatureSchema,
  queryTypeSchema,
  upsertStreamQueryRequestSchema,
} from './src/queries';

export type {
  EventLifecycleResponse,
  GeneratedSignificantEventQuery,
  LifecycleDetection,
  QueryWithOccurrences,
  QueryOccurrencesResponse,
  SignificantEventsQueriesGenerationResult,
} from './src/api/significant_events';

export { generatedSignificantEventQuerySchema } from './src/api/significant_events';

export {
  type BaseFeature,
  type Feature,
  type FeatureUpsert,
  type FeatureWithFilter,
  type IgnoredFeature,
  CODE_ANALYSIS_FEATURE_TYPE,
  COMPUTED_FEATURE_TYPES,
  DATASET_ANALYSIS_FEATURE_TYPE,
  ERROR_LOGS_FEATURE_TYPE,
  INFERRED_FEATURE_TYPES,
  LOG_PATTERNS_FEATURE_TYPE,
  LOG_SAMPLES_FEATURE_TYPE,
  baseFeatureSchema,
  computeFeatureUuid,
  featureSchema,
  featureUpsertSchema,
  hasSameFingerprint,
  identifiedFeatureSchema,
  ignoredFeatureSchema,
  isComputedFeature,
  isDuplicateFeature,
  isFeatureWithFilter,
  mergeFeature,
  normalizeFeatureSlug,
  normalizeFeatureSlugForMatching,
  toBaseFeature,
} from './src/feature';

export { FeatureAccumulator } from './src/feature_accumulator';

export type { IterationResult } from './src/api/features';

export { tokenCountSchema, iterationResultSchema } from './src/api/features';

export {
  type Detection,
  type ChangePointType,
  CHANGE_POINT_TYPES,
  type KnowledgeIndicator,
  type SignificantEvent,
  type SignificantEventStatus,
  type SignificantEventsTuningConfig,
  type TuningConfigFieldBounds,
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  SIGNIFICANT_EVENTS_TUNING_FIELD_BOUNDS,
  type SignificantEventInvestigation,
  type InvestigationHypothesis,
  type InvestigationState,
  type SignificantEventUpdate,
  type InvestigationEvidence,
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS,
  INVESTIGATION_PROGRESS_UI_EVENT,
  INVESTIGATE_STEP_ID,
  MAX_HYPOTHESIS_EVIDENCE,
  MAX_SIGNIFICANT_EVENT_UPDATE_EVIDENCE,
  MAX_SIGNIFICANT_EVENT_UPDATES,
  significantEventUpdateSchema,
  type BlastRadiusEntry,
  type CausalFeature,
  type SignalEntry,
  type Severity,
  severitySchema,
  SEVERITY_OPTIONS,
  getSeverityLabel,
  detectionSchema,
  blastRadiusEntrySchema,
  causalFeatureSchema,
  signalEntrySchema,
  significantEventSchema,
  significantEventStatusSchema,
  significantEventsTuningConfigSchema,
  validateSignificantEventsTuningConfig,
  significantEventInvestigationSchema,
  investigationStateSchema,
  MAX_ID_LENGTH,
  MAX_RULE_NAME_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_SIGNAL_DESCRIPTION_LENGTH,
  MAX_SYMPTOM_HYPOTHESIS_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_ASSESSMENT_NOTE_LENGTH,
  ASSESSMENT_NOTE_ROLE_RULE,
  NO_RAW_SENSITIVE_VALUES_RULE,
  SUMMARY_ROLE_RULE,
  SYMPTOM_HYPOTHESIS_ROLE_RULE,
} from './src/significant_events';

export type {
  KIsOnboardingResult,
  KIsOnboardingFeaturesResult,
  KIsOnboardingQueriesResult,
  KIsOnboardingStatusResult,
} from './src/onboarding';

export { KIsOnboardingStep, KIS_ONBOARDING_IN_PROGRESS_STATUSES } from './src/onboarding';

export type { SignificantEventsWorkflowStatusResult } from './src/workflows';

export { SignificantEventsWorkflowStatus } from './src/workflows';

export {
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
  SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_INFERENCE_FEATURE_ID,
} from './src/inference_feature_ids';

export type { KnowledgeIndicatorClientContract } from './src/knowledge_indicator_client';
