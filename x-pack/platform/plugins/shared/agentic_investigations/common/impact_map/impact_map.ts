/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { userSchema } from '../user';
import { investigationEvidenceSchema } from '../evidence/evidence';
import {
  IMPACT_MAP_ENTITY_KINDS,
  IMPACT_MAP_EVENT_KINDS,
  IMPACT_MAP_HEALTH_STATES,
  IMPACT_MAP_ROLES,
  MAX_IMPACT_MAP_CATALOG_TYPES,
  MAX_IMPACT_MAP_ENTITIES,
  MAX_IMPACT_MAP_EVENTS,
  MAX_IMPACT_MAP_RELATIONSHIPS,
} from './constants';

const MAX_ID_LENGTH = 256;
const MAX_TYPE_ID_LENGTH = 64;
const MAX_LABEL_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_ICON_KEY_LENGTH = 64;
const MAX_SVG_LENGTH = 4_000;
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_ALERT_COUNT = 9_999;

/** Lowercase so `Database` and `database` are one type across investigations. */
const typeIdSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(MAX_TYPE_ID_LENGTH)
    .regex(/^[a-z0-9][a-z0-9_.-]*$/, 'Use lowercase letters, digits, "_", "." or "-".')
);

export const impactMapEntityKindSchema = lazySchema(() => z.enum(IMPACT_MAP_ENTITY_KINDS));
export type ImpactMapEntityKind = z.infer<typeof impactMapEntityKindSchema>;

export const impactMapRoleSchema = lazySchema(() => z.enum(IMPACT_MAP_ROLES));
export type ImpactMapRole = z.infer<typeof impactMapRoleSchema>;

export const impactMapHealthSchema = lazySchema(() => z.enum(IMPACT_MAP_HEALTH_STATES));
export type ImpactMapHealth = z.infer<typeof impactMapHealthSchema>;

/**
 * The icon an entity type draws with. The keys are the service map's: an APM agent name for a
 * service node, a span type and subtype for a dependency node, so a map looks like the service map.
 */
export const impactMapIconSchema = lazySchema(() =>
  z.object({
    /** APM agent name, for example `nodejs`, `java`, `go`, `python`, `opentelemetry`. */
    agent_name: z.string().max(MAX_ICON_KEY_LENGTH).optional(),
    /** Span type of a dependency, for example `db`, `messaging`, `external`, `cache`. */
    span_type: z.string().max(MAX_ICON_KEY_LENGTH).optional(),
    /** Span subtype of a dependency, for example `postgresql`, `kafka`, `http`, `redis`. */
    span_subtype: z.string().max(MAX_ICON_KEY_LENGTH).optional(),
    /**
     * An EUI icon name, for things APM has no agent logo for: `logoKubernetes` for Kubernetes
     * objects, `logoAWS`, `logoDocker` and so on. A renderer draws it when there is no agent_name.
     */
    eui_icon: z.string().max(MAX_ICON_KEY_LENGTH).optional(),
    /** Stored for renderers that draw custom icons; the service map renderer does not. */
    svg: z.string().max(MAX_SVG_LENGTH).optional(),
  })
);
export type ImpactMapIcon = z.infer<typeof impactMapIconSchema>;

export const impactMapEntityTypeSchema = lazySchema(() =>
  z.object({
    id: typeIdSchema,
    label: z.string().min(1).max(MAX_LABEL_LENGTH),
    kind: impactMapEntityKindSchema,
    icon: impactMapIconSchema.optional(),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  })
);
export type ImpactMapEntityType = z.infer<typeof impactMapEntityTypeSchema>;

export const impactMapRelationshipTypeSchema = lazySchema(() =>
  z.object({
    id: typeIdSchema,
    /** The edge label, for example `CALLS`, `RUNS_ON`, `READS_FROM`. */
    label: z.string().min(1).max(MAX_LABEL_LENGTH),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  })
);
export type ImpactMapRelationshipType = z.infer<typeof impactMapRelationshipTypeSchema>;

export const impactMapAnnotationsSchema = lazySchema(() =>
  z.object({
    role: impactMapRoleSchema.optional(),
    health: impactMapHealthSchema.optional(),
    /** Users or the business feel the problem here. */
    impacted: z.boolean().optional(),
    /** Count drawn as the node's badge, for example the alerts firing on it. */
    alert_count: z.number().int().min(0).max(MAX_ALERT_COUNT).optional(),
  })
);
export type ImpactMapAnnotations = z.infer<typeof impactMapAnnotationsSchema>;

export const impactMapEntitySchema = lazySchema(() =>
  z.object({
    id: z.string().min(1).max(MAX_ID_LENGTH),
    type_id: typeIdSchema,
    label: z.string().min(1).max(MAX_LABEL_LENGTH),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
    annotations: impactMapAnnotationsSchema.optional(),
  })
);
export type ImpactMapEntity = z.infer<typeof impactMapEntitySchema>;

export const impactMapRelationshipSchema = lazySchema(() =>
  z.object({
    /** Derived from the endpoints and type when absent. */
    id: z.string().min(1).max(MAX_ID_LENGTH).optional(),
    type_id: typeIdSchema,
    source_id: z.string().min(1).max(MAX_ID_LENGTH),
    target_id: z.string().min(1).max(MAX_ID_LENGTH),
    /** Part of the chain from the root cause to the impact. */
    on_critical_path: z.boolean().optional(),
  })
);
export type ImpactMapRelationship = z.infer<typeof impactMapRelationshipSchema>;

export const impactMapEntitiesSchema = lazySchema(() =>
  z.array(impactMapEntitySchema).max(MAX_IMPACT_MAP_ENTITIES)
);
export const impactMapRelationshipsSchema = lazySchema(() =>
  z.array(impactMapRelationshipSchema).max(MAX_IMPACT_MAP_RELATIONSHIPS)
);
export const impactMapEntityTypesSchema = lazySchema(() =>
  z.array(impactMapEntityTypeSchema).max(MAX_IMPACT_MAP_CATALOG_TYPES)
);
export const impactMapRelationshipTypesSchema = lazySchema(() =>
  z.array(impactMapRelationshipTypeSchema).max(MAX_IMPACT_MAP_CATALOG_TYPES)
);

const MAX_EVENT_LINKS = 5;
const MAX_URL_LENGTH = 2_048;

export const impactMapEventKindSchema = lazySchema(() => z.enum(IMPACT_MAP_EVENT_KINDS));
export type ImpactMapEventKind = z.infer<typeof impactMapEventKindSchema>;

/**
 * Something that happened during the incident, placed against the entity or relationship it
 * happened to, so the map shows where and the timeline shows when. The chart, when there is one,
 * shows the trend around `at`.
 */
export const impactMapEventSchema = lazySchema(() =>
  z.object({
    /** Stable across passes, so a later write updates the event instead of adding it again. */
    id: z.string().min(1).max(MAX_ID_LENGTH),
    kind: impactMapEventKindSchema,
    title: z.string().min(1).max(MAX_LABEL_LENGTH),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
    /** ISO 8601. */
    at: z.string().min(1).max(MAX_TIMESTAMP_LENGTH),
    ends_at: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
    /** The entity it happened to. A response may have neither this nor `relationship_id`. */
    entity_id: z.string().max(MAX_ID_LENGTH).optional(),
    /** The relationship it happened to, as the map ids it: `source->target`. */
    relationship_id: z.string().max(MAX_ID_LENGTH).optional(),
    evidence: investigationEvidenceSchema.optional(),
    links: z
      .array(
        z.object({
          label: z.string().min(1).max(MAX_LABEL_LENGTH),
          url: z.string().url().max(MAX_URL_LENGTH),
        })
      )
      .max(MAX_EVENT_LINKS)
      .optional(),
  })
);
export type ImpactMapEvent = z.infer<typeof impactMapEventSchema>;

export const impactMapEventsSchema = lazySchema(() =>
  z.array(impactMapEventSchema).max(MAX_IMPACT_MAP_EVENTS)
);

/** The types one space has defined, reused across its investigations. */
export interface ImpactMapCatalog {
  entity_types: ImpactMapEntityType[];
  relationship_types: ImpactMapRelationshipType[];
}

/**
 * Stored impact map: the graph, plus a copy of the types it uses so it still draws the same
 * after the space catalog changes. The graph is replaced on every write; events are merged.
 */
export const investigationImpactMapSchema = lazySchema(() =>
  z.object({
    id: z.string().max(MAX_ID_LENGTH),
    spaceId: z.string().max(MAX_ID_LENGTH),
    conversationId: z.string().max(MAX_ID_LENGTH),
    title: z.string().max(MAX_LABEL_LENGTH).optional(),
    entities: impactMapEntitiesSchema,
    relationships: impactMapRelationshipsSchema,
    entityTypes: impactMapEntityTypesSchema,
    relationshipTypes: impactMapRelationshipTypesSchema,
    /** Kept across map writes and merged by id: events accumulate while the graph is redrawn. */
    events: impactMapEventsSchema.optional(),
    createdAt: z.string().max(MAX_TIMESTAMP_LENGTH),
    createdBy: userSchema.optional(),
    updatedAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
  })
);
export type InvestigationImpactMap = z.infer<typeof investigationImpactMapSchema>;
