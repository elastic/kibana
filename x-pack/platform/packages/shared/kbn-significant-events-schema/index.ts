/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type EsqlQuery,
  type QueriesGetResponse,
  type QueryFeature,
  type QueryLink,
  type QueryType,
  type SignificantEventType,
  type StreamQuery,
  CRITICAL_SEVERITY_THRESHOLD,
  HIGH_SEVERITY_THRESHOLD,
  QUERY_TYPE_MATCH,
  QUERY_TYPE_STATS,
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
  SIGNIFICANT_EVENT_TYPES,
  bulkStreamQueryInputSchema,
  esqlQuerySchema,
  isExpirable,
  isExpired,
  queryFeatureSchema,
  queryTypeSchema,
  significantEventTypeSchema,
  upsertStreamQueryRequestSchema,
} from './src/queries';

export type {
  EventDeactivation,
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
  MAX_FEATURE_ARRAY_ITEMS,
  mergeFeature,
  normalizeFeatureSlug,
  normalizeFeatureSlugForMatching,
  toBaseFeature,
} from './src/feature';

export { type AggregatedFeature, groupFeaturesAcrossSources } from './src/feature_aggregation';

export { FeatureAccumulator } from './src/feature_accumulator';

export type { IterationResult } from './src/api/features';

export { tokenCountSchema, iterationResultSchema } from './src/api/features';

export {
  type Detection,
  type DetectionSkip,
  type ChangePointType,
  CHANGE_POINT_TYPES,
  type KnowledgeIndicator,
  type SignificantEvent,
  type SignificantEventResponse,
  type SignificantEventStatus,
  type SignificantEventManualStatus,
  type SignificantEventsTuningConfig,
  type TuningConfigFieldBounds,
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  SIGNIFICANT_EVENTS_TUNING_FIELD_BOUNDS,
  type SignificantEventInvestigation,
  type InvestigationRunStatus,
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS,
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  type BlastRadiusEntry,
  type CausalFeature,
  type SignalEntry,
  type SignalVerdict,
  type Severity,
  severitySchema,
  SEVERITY_OPTIONS,
  SEVERITY_CONTRACT_RULE,
  UNCONFIRMED_EVENT_MAX_CONFIDENCE,
  getSeverityLabel,
  detectionSchema,
  detectionSkipSchema,
  skipMarkerSchema,
  type SkipMarker,
  describeSkip,
  PROBE_STATUSES,
  type ProbeStatus,
  type BaselineDecision,
  SKIP_REASONS,
  type SkipReason,
  NEEDS_AGENT_REASONS,
  type NeedsAgentReason,
  baselineObservationSchema,
  type BaselineObservation,
  blastRadiusEntrySchema,
  causalFeatureSchema,
  signalEntrySchema,
  signalInputEntrySchema,
  type SignalInputEntry,
  SIGNAL_VERDICTS,
  significantEventSchema,
  significantEventStatusSchema,
  significantEventManualStatusSchema,
  SIGNIFICANT_EVENT_MANUAL_STATUS_OPTIONS,
  operatorFallbackAssessmentNote,
  MAX_DEACTIVATION_REASON_LENGTH,
  INACTIVE_SERIES_LOOKBACK_HOURS,
  significantEventsTuningConfigSchema,
  validateSignificantEventsTuningConfig,
  resolveSignificantEventsTuningConfig,
  significantEventInvestigationSchema,
  MAX_SHORT_STRING_LENGTH,
  MAX_MEDIUM_STRING_LENGTH,
  MAX_ARRAY_LENGTH,
  MAX_ID_LENGTH,
  MAX_RULE_NAME_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  ASSESSMENT_NOTE_ROLE_RULE,
  NARRATIVE_AGREEMENT_RULE,
  DISCOVERY_SEVERITY_APPLICATION_RULE,
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
  type SourceWriteConflictReason,
  isRetryableSourceWriteConflict,
  isSourceWriteConflictReason,
} from './src/source_write_conflict';

export { NightshiftModelBlockedError } from './src/nightshift_model_blocked_error';
export { NightshiftModelNotFoundError } from './src/nightshift_model_not_found_error';

export { NIGHTSHIFT_DEFAULT_MODELS, type NightshiftModelStep } from './src/nightshift_models';
