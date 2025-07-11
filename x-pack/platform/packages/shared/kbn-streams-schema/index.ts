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
export { UnwiredIngest } from './src/models/ingest/unwired';
export { Group } from './src/models/group';

export {
  type ProcessorDefinition,
  type ProcessorConfig,
  type ProcessorDefinitionWithId,
  type ProcessorType,
  type ProcessorTypeOf,
  type KvProcessorDefinition,
  type KvProcessorConfig,
  type GeoIpProcessorConfig,
  type GeoIpProcessorDefinition,
  type SetProcessorConfig,
  type SetProcessorDefinition,
  type RenameProcessorConfig,
  type RenameProcessorDefinition,
  type UrlDecodeProcessorConfig,
  type UrlDecodeProcessorDefinition,
  type UserAgentProcessorConfig,
  type UserAgentProcessorDefinition,
  type DateProcessorConfig,
  type DateProcessorDefinition,
  type DissectProcessorConfig,
  type DissectProcessorDefinition,
  type GrokProcessorConfig,
  type GrokProcessorDefinition,
  type ManualIngestPipelineProcessorConfig as ManualIngestPipelineProcessorConfig,
  type ManualIngestPipelineProcessorDefinition as ManualIngestPipelineProcessorDefinition,
  getProcessorConfig,
  getProcessorType,
  processorWithIdDefinitionSchema,
  processorDefinitionSchema,
} from './src/models/ingest/processors';

export { type RoutingDefinition, routingDefinitionListSchema } from './src/models/ingest/routing';

export { type ContentPack, contentPackSchema } from './src/content';

export { isRootStreamDefinition } from './src/helpers/is_root';
export { getIndexPatternsForStream } from './src/helpers/hierarchy_helpers';

export {
  keepFields,
  namespacePrefixes,
  isNamespacedEcsField,
  getRegularEcsField,
} from './src/helpers/namespaced_ecs';
export { getAdvancedParameters } from './src/helpers/get_advanced_parameters';
export { getInheritedFieldsFromAncestors } from './src/helpers/get_inherited_fields_from_ancestors';

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

export { getConditionFields } from './src/helpers/get_condition_fields';

export {
  type StreamQuery,
  type StreamQueryKql,
  upsertStreamQueryRequestSchema,
  streamQueryKqlSchema,
  streamQuerySchema,
} from './src/queries';

export { findInheritedLifecycle, findInheritingStreams } from './src/helpers/lifecycle';

export {
  type IngestStreamLifecycle,
  type UnwiredIngestStreamEffectiveLifecycle,
  type IlmPolicyPhases,
  type IlmPolicyPhase,
  type IlmPolicyHotPhase,
  type IlmPolicyDeletePhase,
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
  type BinaryFilterCondition,
  type Condition,
  type FilterCondition,
  type UnaryFilterCondition,
  type AlwaysCondition,
  type UnaryOperator,
  type NeverCondition,
  isAlwaysCondition,
  isAndCondition,
  isFilterCondition,
  isNeverCondition,
  isOrCondition,
  isUnaryFilterCondition,
  isBinaryFilterCondition,
  conditionSchema,
  isCondition,
} from './src/conditions';

export type {
  SignificantEventsResponse,
  SignificantEventsGetResponse,
  SignificantEventsPreviewResponse,
} from './src/api/significant_events';

export { conditionToQueryDsl } from './src/helpers/condition_to_query_dsl';
