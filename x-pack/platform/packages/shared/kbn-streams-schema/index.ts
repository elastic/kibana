/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { Streams } from './src/stream_management/models/streams';
export { IngestBase, type IngestStreamIndexMode } from './src/stream_management/models/ingest/base';
export { Ingest } from './src/stream_management/models/ingest';
export { WiredIngest } from './src/stream_management/models/ingest/wired';
export { ClassicIngest } from './src/stream_management/models/ingest/classic';
export { Query } from './src/stream_management/models/query';
export {
  ESQL_VIEW_PREFIX,
  getEsqlViewName,
  getStreamNameFromViewName,
} from './src/stream_management/models/query/view_name';

export {
  type RoutingDefinition,
  routingStatus,
  type RoutingStatus,
  isRoutingEnabled,
  routingDefinitionListSchema,
} from './src/stream_management/models/ingest/routing';

export { getStreamTypeFromDefinition } from './src/stream_management/helpers/get_stream_type_from_definition';
export type { StreamType } from './src/stream_management/helpers/get_stream_type_from_definition';
export { isRootStreamDefinition } from './src/stream_management/helpers/is_root';
export { isOtelStream } from './src/stream_management/helpers/is_otel_stream';
export { getIndexPatternsForStream } from './src/stream_management/helpers/hierarchy_helpers';
export { getDiscoverEsqlQuery } from './src/stream_management/helpers/get_discover_esql_query';
export {
  convertUpsertRequestIntoDefinition,
  convertGetResponseIntoUpsertRequest,
} from './src/stream_management/helpers/converters';

export {
  keepFields,
  namespacePrefixes,
  isNamespacedEcsField,
  getRegularEcsField,
} from './src/stream_management/helpers/namespaced_ecs';
export { getAdvancedParameters } from './src/stream_management/helpers/get_advanced_parameters';
export { getInheritedFieldsFromAncestors } from './src/stream_management/helpers/get_inherited_fields_from_ancestors';
export { getInheritedSettings } from './src/stream_management/helpers/get_inherited_settings';
export { buildEsqlQuery } from './src/sig_events/query';

export * from './src/stream_management/ingest_pipeline_processors';

export {
  type SampleDocument,
  type FlattenRecord,
  flattenRecord,
  recursiveRecord,
} from './src/stream_management/shared/record_types';
export { isSchema, createIsNarrowSchema } from './src/stream_management/shared/type_guards';

export {
  isChildOf,
  isDescendantOf,
  getAncestors,
  getAncestorsAndSelf,
  getParentId,
  getSegments,
  MAX_NESTING_LEVEL,
  isRoot,
} from './src/stream_management/shared/hierarchy';

export {
  type FieldDefinition,
  type NamedFieldDefinitionConfig,
  type FieldDefinitionConfig,
  type InheritedFieldDefinitionConfig,
  type InheritedFieldDefinition,
  type FieldDefinitionConfigAdvancedParameters,
  fieldDefinitionConfigSchema,
  namedFieldDefinitionConfigSchema,
} from './src/stream_management/fields';

export {
  type StreamQuery,
  type StreamQueryInput,
  type QueriesGetResponse,
  type QueriesOccurrencesGetResponse,
  upsertStreamQueryRequestSchema,
  streamQuerySchema,
  streamQueryInputSchema,
} from './src/sig_events/queries';

export {
  findInheritedLifecycle,
  findInheritingStreams,
  effectiveToIngestLifecycle,
} from './src/stream_management/helpers/lifecycle';

export { findInheritedFailureStore } from './src/stream_management/helpers/failure_store';

export { streamObjectNameSchema } from './src/stream_management/shared/stream_object_name';

export {
  type IngestStreamLifecycle,
  type ClassicIngestStreamEffectiveLifecycle,
  type IlmPolicyPhases,
  type IlmPolicyPhase,
  type IlmPolicyHotPhase,
  type IlmPolicyDeletePhase,
  type IngestStreamLifecycleAll,
  type IngestStreamLifecycleILM,
  type IngestStreamLifecycleDSL,
  type IngestStreamLifecycleDisabled,
  type IngestStreamLifecycleInherit,
  type IngestStreamEffectiveLifecycle,
  type PhaseName,
  type IlmPolicy,
  type IlmPolicyWithUsage,
  type IlmPolicyUsage,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isErrorLifecycle,
  isDisabledLifecycle,
} from './src/stream_management/models/ingest/lifecycle';

export {
  type IngestStreamSettings,
  type WiredIngestStreamEffectiveSettings,
} from './src/stream_management/models/ingest/settings';

export {
  type FailureStore,
  type EffectiveFailureStore,
  type WiredIngestStreamEffectiveFailureStore,
  type FailureStoreStatsResponse,
  isEnabledFailureStore,
  isInheritFailureStore,
  isDisabledLifecycleFailureStore,
  isEnabledLifecycleFailureStore,
} from './src/stream_management/models/ingest/failure_store';

export type {
  SignificantEventsResponse,
  SignificantEventsGetResponse,
  SignificantEventsPreviewResponse,
  SignificantEventsGenerateResponse,
  GeneratedSignificantEventQuery,
  SignificantEventsQueriesGenerationResult,
  SignificantEventsQueriesGenerationTaskResult,
} from './src/sig_events/api/significant_events';

export { emptyAssets } from './src/stream_management/helpers/empty_assets';
export {
  validateStreamName,
  MAX_STREAM_NAME_LENGTH,
  INVALID_STREAM_NAME_CHARACTERS,
} from './src/stream_management/helpers/stream_name_validation';

export {
  type Feature,
  type BaseFeature,
  type FeatureStatus,
  DATASET_ANALYSIS_FEATURE_TYPE,
  LOG_SAMPLES_FEATURE_TYPE,
  LOG_PATTERNS_FEATURE_TYPE,
  ERROR_LOGS_FEATURE_TYPE,
  COMPUTED_FEATURE_TYPES,
  isFeature,
  isComputedFeature,
  featureSchema,
  baseFeatureSchema,
  featureStatusSchema,
} from './src/sig_events/feature';

export { type System, systemSchema, isSystem } from './src/sig_events/system';

export {
  type BaseSimulationError,
  type SimulationError,
  type DocSimulationStatus,
  type SimulationDocReport,
  type ProcessorMetrics,
  type DetectedField,
  type WithNameAndEsType,
  type DocumentsMetrics,
  type ProcessingSimulationResponse,
} from './src/stream_management/models/processing_simulation';

export { type IngestStreamProcessing } from './src/stream_management/models/ingest/processing';

export { TaskStatus, type TaskResult } from './src/sig_events/tasks/types';

export type { GenerateDescriptionResult } from './src/sig_events/api/description_generation';
export type { IdentifyFeaturesResult } from './src/sig_events/api/features';

export type { InsightsResult, Insight, InsightImpactLevel } from './src/sig_events/insights';
export type { OnboardingResult } from './src/sig_events/onboarding';
export { OnboardingStep } from './src/sig_events/onboarding';
