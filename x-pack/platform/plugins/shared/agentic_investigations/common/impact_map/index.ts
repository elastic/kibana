/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  IMPACT_MAP_ATTACHMENT_TYPE,
  IMPACT_MAP_CATALOG_INDEX_NAME,
  IMPACT_MAP_ENTITY_KINDS,
  IMPACT_MAP_EVENT_KINDS,
  IMPACT_MAP_HEALTH_STATES,
  IMPACT_MAP_INDEX_NAME,
  IMPACT_MAP_ROLES,
  MAX_IMPACT_MAP_CATALOG_TYPES,
  MAX_IMPACT_MAP_ENTITIES,
  MAX_IMPACT_MAP_EVENTS,
  MAX_IMPACT_MAP_RELATIONSHIPS,
  SET_IMPACT_MAP_TOOL_ID,
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
  impactMapEventSchema,
  impactMapEventsSchema,
  impactMapHealthSchema,
  impactMapIconSchema,
  impactMapRelationshipSchema,
  impactMapRelationshipsSchema,
  impactMapRelationshipTypeSchema,
  impactMapRelationshipTypesSchema,
  impactMapRoleSchema,
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
  ImpactMapRelationship,
  ImpactMapRelationshipType,
  ImpactMapRole,
  InvestigationImpactMap,
} from './impact_map';

export { mergeImpactMapCatalog, resolveImpactMapGraph } from './resolve_graph';
export type { ResolvedImpactMapGraph } from './resolve_graph';

export { toEntityName } from './entity_name';
export {
  impactMapEventId,
  mergeImpactMapEvents,
  sortImpactMapEvents,
  withImpactMapEventId,
} from './events';
export type { ImpactMapEventInput } from './events';
