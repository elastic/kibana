/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { Streams } from './src/models/streams';
export { IngestBase } from './src/models/ingest/base';
export { Ingest } from './src/models/ingest';
export { WiredIngest } from './src/models/ingest/wired';
export { ClassicIngest } from './src/models/ingest/classic';

export {
  type RoutingDefinition,
  routingStatus,
  type RoutingStatus,
  isRoutingEnabled,
  routingDefinitionListSchema,
} from './src/models/ingest/routing';

export { getStreamTypeFromDefinition } from './src/helpers/get_stream_type_from_definition';
export type { StreamType } from './src/helpers/get_stream_type_from_definition';
export { isRootStreamDefinition } from './src/helpers/is_root';
export { isOtelStream } from './src/helpers/is_otel_stream';
export { getIndexPatternsForStream } from './src/helpers/hierarchy_helpers';
export {
  convertUpsertRequestIntoDefinition,
  convertGetResponseIntoUpsertRequest,
} from './src/helpers/converters';

export {
  keepFields,
  namespacePrefixes,
  isNamespacedEcsField,
  getRegularEcsField,
} from './src/helpers/namespaced_ecs';
export { getAdvancedParameters } from './src/helpers/get_advanced_parameters';
export { getInheritedFieldsFromAncestors } from './src/helpers/get_inherited_fields_from_ancestors';
export { getInheritedSettings } from './src/helpers/get_inherited_settings';
export { buildEsqlQuery } from './src/helpers/query';

export * from './src/ingest_pipeline_processors';

export {
  type SampleDocument,
  type FlattenRecord,
  flattenRecord,
  recursiveRecord,
} from './src/shared/record_types';
export { isSchema, createIsNarrowSchema } from './src/shared/type_guards';

export {
  isChildOf,
  isDescendantOf,
  getAncestors,
  getAncestorsAndSelf,
  getParentId,
  getSegments,
  MAX_NESTING_LEVEL,
  isRoot,
} from './src/shared/hierarchy';

export {
  type FieldDefinition,
  type NamedFieldDefinitionConfig,
  type FieldDefinitionConfig,
  type InheritedFieldDefinitionConfig,
  type InheritedFieldDefinition,
  type FieldDefinitionConfigAdvancedParameters,
  fieldDefinitionConfigSchema,
  namedFieldDefinitionConfigSchema,
} from './src/fields';

export {
  type StreamQuery,
  type StreamQueryKql,
  upsertStreamQueryRequestSchema,
  streamQueryKqlSchema,
  streamQuerySchema,
} from './src/queries';

export {
  findInheritedLifecycle,
  findInheritingStreams,
  effectiveToIngestLifecycle,
} from './src/helpers/lifecycle';

export { findInheritedFailureStore } from './src/helpers/failure_store';

export { streamObjectNameSchema } from './src/shared/stream_object_name';

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
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isErrorLifecycle,
  isDisabledLifecycle,
} from './src/models/ingest/lifecycle';

export {
  type IngestStreamSettings,
  type WiredIngestStreamEffectiveSettings,
} from './src/models/ingest/settings';

export {
  type FailureStore,
  type EffectiveFailureStore,
  type WiredIngestStreamEffectiveFailureStore,
  type FailureStoreStatsResponse,
  isEnabledFailureStore,
  isInheritFailureStore,
  isDisabledLifecycleFailureStore,
  isEnabledLifecycleFailureStore,
} from './src/models/ingest/failure_store';

export type {
  SignificantEventsResponse,
  SignificantEventsGetResponse,
  SignificantEventsPreviewResponse,
  SignificantEventsGenerateResponse,
  GeneratedSignificantEventQuery,
  SignificantEventsQueriesGenerationResult,
  SignificantEventsQueriesGenerationTaskResult,
} from './src/api/significant_events';

export { emptyAssets } from './src/helpers/empty_assets';

export {
  type Feature,
  type BaseFeature,
  type FeatureStatus,
  isFeature,
  featureSchema,
  baseFeatureSchema,
  featureStatusSchema,
} from './src/feature';

export { type System, systemSchema, isSystem } from './src/system';

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
} from './src/models/processing_simulation';

export { type IngestStreamProcessing } from './src/models/ingest/processing';

export { TaskStatus } from './src/tasks/types';
