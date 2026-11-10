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

/**
 * One document per event: the events of every investigation in the space, searchable by kind,
 * time and what they happened to. The map document still carries the events its flyout reads.
 */
export const IMPACT_MAP_EVENTS_INDEX_NAME = '.kibana-investigation-impact_map_events' as const;

/** Bounds that keep a map readable in the flyout and a tool call small enough for the agent. */
export const MAX_IMPACT_MAP_ENTITIES = 50;
export const MAX_IMPACT_MAP_RELATIONSHIPS = 100;
export const MAX_IMPACT_MAP_CATALOG_TYPES = 100;
export const MAX_IMPACT_MAP_EVENTS = 200;
export const MAX_IMPACT_MAP_ENTITY_METADATA = 40;
export const MAX_IMPACT_MAP_TYPE_FIELDS = 30;

/**
 * What an event on the map is: something done to the system (a change), something it did (a
 * failure, an alert, an anomaly, a condition it was in), what customers felt, what the investigation found,
 * or what responders did. A finding or a response need not belong to an entity; every other kind
 * happens to one entity or relationship.
 */
export const IMPACT_MAP_EVENT_KINDS = [
  'change',
  'failure',
  'condition',
  'alert',
  'anomaly',
  'mitigation',
  'recovery',
  'root_cause',
  'customer_impact',
  'investigation',
  'response',
] as const;

/**
 * How an entity type draws: a circle for a service (application code you run, with its APM agent
 * logo), and a rounded square, with the icon that suits the type, for everything else: a database,
 * a queue, a Kubernetes object, a host, a cloud resource, an external API.
 */
export const IMPACT_MAP_ENTITY_KINDS = ['service', 'infrastructure'] as const;

/**
 * The kinds a stored map can still carry. `dependency` (a diamond) is gone: it is read as
 * `infrastructure`, with an icon chosen from its span type, and never written.
 */
export const IMPACT_MAP_STORED_ENTITY_KINDS = [...IMPACT_MAP_ENTITY_KINDS, 'dependency'] as const;

/**
 * Where a fact on the map came from. Telemetry and code are first-hand; `diagram`, `doc` and
 * `catalog` are what people wrote down and may be stale; `inferred` is the agent's hypothesis, so
 * the map draws it dashed and says so.
 */
export const IMPACT_MAP_SOURCES = [
  'log',
  'trace',
  'metric',
  'config',
  'code',
  'catalog',
  'diagram',
  'doc',
  'chat',
  'inferred',
] as const;

/** How sure the agent is that an entity or a link is real. */
export const IMPACT_MAP_CONFIDENCES = ['high', 'medium', 'low'] as const;

/** Where an entity sits in the story of the problem. */
export const IMPACT_MAP_ROLES = ['root_cause', 'symptom', 'contributor', 'context'] as const;

export const IMPACT_MAP_HEALTH_STATES = ['healthy', 'degraded', 'critical', 'unknown'] as const;

/** Agent Builder builtin tool that records an investigation's impact map. */
export const SET_IMPACT_MAP_TOOL_ID = 'agentic_investigations.set_impact_map' as const;

/** Attachment type of the chat card that shows an investigation's timeline. */
export const TIMELINE_ATTACHMENT_TYPE = 'investigation_timeline' as const;

/** Agent Builder builtin tool that puts the timeline card in the chat. */
export const SHOW_TIMELINE_TOOL_ID = 'agentic_investigations.show_timeline' as const;

/** Agent Builder builtin tool that reads and extends the space's impact map catalog. */
export const UPSERT_IMPACT_MAP_CATALOG_TOOL_ID =
  'agentic_investigations.upsert_impact_map_catalog' as const;

/** Agent Builder builtin tool that reads a Mermaid diagram into impact map entities and links. */
export const PARSE_MERMAID_TOOL_ID = 'agentic_investigations.parse_mermaid' as const;

/** Internal route that replaces an investigation's impact map. */
export const INVESTIGATION_IMPACT_MAP_URL =
  `${INVESTIGATIONS_INTERNAL_URL}/{id}/impact_map` as const;
