/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INVESTIGATIONS_INTERNAL_URL } from '../investigations/constants';

/** Attachment type identifier registered with Agent Builder. */
export const IMPACT_MAP_ATTACHMENT_TYPE = 'investigation_impact_map' as const;

/**
 * One document per space and conversation. See README "Index naming": underscores, because
 * `.kibana-investigation-impact-map` would fall under the impact index's `-*` template.
 */
export const IMPACT_MAP_INDEX_NAME = '.kibana-investigation-impact_map' as const;

/** One document per space: the entity and relationship types every impact map reuses. */
export const IMPACT_MAP_CATALOG_INDEX_NAME = '.kibana-investigation-impact_map_catalog' as const;

/** Bounds that keep a map readable in the flyout and a tool call small enough for the agent. */
export const MAX_IMPACT_MAP_ENTITIES = 50;
export const MAX_IMPACT_MAP_RELATIONSHIPS = 100;
export const MAX_IMPACT_MAP_CATALOG_TYPES = 100;
export const MAX_IMPACT_MAP_EVENTS = 200;
export const MAX_IMPACT_MAP_ENTITY_METADATA = 40;
export const MAX_IMPACT_MAP_TYPE_FIELDS = 30;

/**
 * What an event on the map is: something done to the system (a change), something it did (a
 * failure, an alert, a condition it was in), what customers felt, what the investigation found,
 * or what responders did. A finding or a response need not belong to an entity; every other kind
 * happens to one entity or relationship.
 */
export const IMPACT_MAP_EVENT_KINDS = [
  'change',
  'failure',
  'condition',
  'alert',
  'mitigation',
  'customer_impact',
  'investigation',
  'response',
] as const;

/**
 * How an entity type draws, using the service map's own nodes: a circle for something that runs
 * code (a service, a pod, a function), a diamond for something it depends on (a database, a
 * queue, an external host).
 */
export const IMPACT_MAP_ENTITY_KINDS = ['service', 'dependency', 'infrastructure'] as const;

/** Where an entity sits in the story of the problem. */
export const IMPACT_MAP_ROLES = ['root_cause', 'symptom', 'contributor', 'context'] as const;

export const IMPACT_MAP_HEALTH_STATES = ['healthy', 'degraded', 'critical', 'unknown'] as const;

/** Agent Builder builtin tool that records an investigation's impact map. */
export const SET_IMPACT_MAP_TOOL_ID = 'agentic_investigations.set_impact_map' as const;

/** Agent Builder builtin tool that reads and extends the space's impact map catalog. */
export const UPSERT_IMPACT_MAP_CATALOG_TOOL_ID =
  'agentic_investigations.upsert_impact_map_catalog' as const;

/** Internal route that replaces an investigation's impact map. */
export const INVESTIGATION_IMPACT_MAP_URL =
  `${INVESTIGATIONS_INTERNAL_URL}/{id}/impact_map` as const;
