/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  IMPACT_MAP_ATTACHMENT_TYPE,
  IMPACT_MAP_CATALOG_INDEX_NAME,
  IMPACT_MAP_EVENTS_INDEX_NAME,
  IMPACT_MAP_ENTITY_KINDS,
  IMPACT_MAP_STORED_ENTITY_KINDS,
  IMPACT_MAP_EVENT_KINDS,
  IMPACT_MAP_HEALTH_STATES,
  IMPACT_MAP_INDEX_NAME,
  IMPACT_MAP_ROLES,
  IMPACT_MAP_SOURCES,
  IMPACT_MAP_CONFIDENCES,
  MAX_IMPACT_MAP_CATALOG_TYPES,
  MAX_IMPACT_MAP_ENTITIES,
  MAX_IMPACT_MAP_EVENTS,
  MAX_IMPACT_MAP_RELATIONSHIPS,
  PARSE_MERMAID_TOOL_ID,
  SET_IMPACT_MAP_TOOL_ID,
  SHOW_TIMELINE_TOOL_ID,
  TIMELINE_ATTACHMENT_TYPE,
  UPSERT_IMPACT_MAP_CATALOG_TOOL_ID,
} from './constants';

export {
  impactMapAnnotationsSchema,
  impactMapEntitiesSchema,
  impactMapEntityKindSchema,
  impactMapEntitySchema,
  impactMapEntityTypeSchema,
  impactMapEntityTypesSchema,
  impactMapEventKindSchema,
  impactMapDataSourceSchema,
  impactMapEventSchema,
  impactMapEventsSchema,
  impactMapHealthSchema,
  impactMapIconSchema,
  impactMapMetadataEntrySchema,
  impactMapMetadataFieldSchema,
  impactMapRelationshipSchema,
  impactMapRelationshipsSchema,
  impactMapRelationshipTypeSchema,
  impactMapRelationshipTypesSchema,
  impactMapRoleSchema,
  impactMapSourceSchema,
  impactMapConfidenceSchema,
  investigationImpactMapSchema,
} from './impact_map';

export type {
  ImpactMapAnnotations,
  ImpactMapCatalog,
  ImpactMapEntity,
  ImpactMapEntityKind,
  ImpactMapEntityType,
  ImpactMapEvent,
  ImpactMapEventKind,
  ImpactMapHealth,
  ImpactMapIcon,
  ImpactMapMetadataEntry,
  ImpactMapMetadataField,
  ImpactMapRelationship,
  ImpactMapRelationshipType,
  ImpactMapRole,
  ImpactMapSource,
  ImpactMapConfidence,
  InvestigationImpactMap,
} from './impact_map';

export { mergeImpactMapCatalog, resolveImpactMapGraph } from './resolve_graph';
export type { ResolvedImpactMapGraph } from './resolve_graph';

export {
  BUILT_IN_CATALOG,
  BUILT_IN_ENTITY_TYPES,
  BUILT_IN_RELATIONSHIP_TYPES,
  canonicalEntityTypeId,
  KNOWN_EUI_ICONS,
  getLegacyDependencyIcon,
  normalizeEntityType,
} from './built_in_types';

export {
  DEFAULT_INFRASTRUCTURE_ICON,
  DEFAULT_SERVICE_ICON,
  isKnownEuiIcon,
  resolveEntityIcon,
} from './entity_icons';

export { resolveEntityMetadata, STANDARD_METADATA_FIELDS } from './metadata';
export type { EntityMetadataRow } from './metadata';

export { toEntityName } from './entity_name';
export {
  impactMapEventId,
  mergeImpactMapEvents,
  sortImpactMapEvents,
  withImpactMapEventId,
} from './events';
export type { ImpactMapEventInput } from './events';

export {
  redactSecrets,
  sanitizeDataSource,
  toBaseUrl,
  type ImpactMapDataSource,
} from './data_source';

export { impactMapToMermaid, parseMermaid } from './mermaid';
export type { ParsedMermaid } from './mermaid';
