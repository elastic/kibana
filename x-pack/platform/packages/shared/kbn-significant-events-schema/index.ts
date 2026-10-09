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
  MAX_FEATURE_ARRAY_ITEMS,
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
  type SignificantEventResponse,
  type SignificantEventStatus,
  type SignificantEventsTuningConfig,
  type TuningConfigFieldBounds,
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  SIGNIFICANT_EVENTS_TUNING_FIELD_BOUNDS,
  type SignificantEventInvestigation,
  type InvestigationHypothesis,
  type InvestigationImpact,
  type InvestigationImpactEntity,
  type InvestigationRecommendation,
  type InvestigationRunStatus,
  type InvestigationState,
  type InvestigationEvidence,
  type EvidenceChart,
  type EvidenceChartSeries,
  type EvidenceChartAnnotation,
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS,
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  INVESTIGATION_PROGRESS_UI_EVENT,
  INVESTIGATE_STEP_ID,
  MAX_HYPOTHESIS_EVIDENCE,
  MAX_HYPOTHESES,
  MAX_IMPACT_ENTITIES,
  MAX_RECOMMENDATIONS,
  MAX_EVIDENCE_CHART_SERIES,
  MAX_EVIDENCE_CHART_POINTS,
  MAX_EVIDENCE_CHART_ANNOTATIONS,
  EVIDENCE_CHART_TYPES,
  EVIDENCE_CHART_X_AXIS_TYPES,
  EVIDENCE_CHART_Y_AXIS_UNITS,
  evidenceChartSchema,
  investigationEvidenceSchema,
  investigationImpactEntitySchema,
  investigationImpactSchema,
  investigationHypothesisSchema,
  investigationRecommendationSchema,
  type BlastRadiusEntry,
  type CausalFeature,
  type SignalEntry,
  type SignalVerdict,
  type SignalEffect,
  type Severity,
  severitySchema,
  SEVERITY_OPTIONS,
  SEVERITY_CONTRACT_RULE,
  EFFECT_CONTRACT_RULE,
  getSeverityLabel,
  detectionSchema,
  blastRadiusEntrySchema,
  causalFeatureSchema,
  signalEntrySchema,
  SIGNAL_VERDICTS,
  SIGNAL_EFFECTS,
  significantEventSchema,
  significantEventStatusSchema,
  significantEventsTuningConfigSchema,
  validateSignificantEventsTuningConfig,
  resolveSignificantEventsTuningConfig,
  significantEventInvestigationSchema,
  investigationStateSchema,
  MAX_SHORT_STRING_LENGTH,
  MAX_MEDIUM_STRING_LENGTH,
  MAX_ARRAY_LENGTH,
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

export { NightshiftModelBlockedError } from './src/nightshift_model_blocked_error';
export { NightshiftModelNotFoundError } from './src/nightshift_model_not_found_error';

export { NIGHTSHIFT_DEFAULT_MODELS, type NightshiftModelStep } from './src/nightshift_models';

export type { KnowledgeIndicatorClientContract } from './src/knowledge_indicator_client';
