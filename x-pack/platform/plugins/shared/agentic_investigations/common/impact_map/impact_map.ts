/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  MAX_DATA_SOURCE_ENDPOINT_LENGTH,
  MAX_DATA_SOURCE_NAME_LENGTH,
  MAX_DATA_SOURCE_INSTANCE_LENGTH,
  MAX_DATA_SOURCE_URL_LENGTH,
  DATA_SOURCE_SCOPES,
  MAX_DATA_SOURCE_PAYLOAD_LENGTH,
  MAX_DATA_SOURCE_QUERY_LENGTH,
} from './data_source';
import { userSchema } from '../user';
import { investigationEvidenceSchema } from '../evidence/evidence';
import {
  IMPACT_MAP_STORED_ENTITY_KINDS,
  IMPACT_MAP_CONFIDENCES,
  IMPACT_MAP_SOURCES,
  IMPACT_MAP_EVENT_KINDS,
  IMPACT_MAP_HEALTH_STATES,
  IMPACT_MAP_ROLES,
  MAX_IMPACT_MAP_CATALOG_TYPES,
  MAX_IMPACT_MAP_ENTITIES,
  MAX_IMPACT_MAP_ENTITY_METADATA,
  MAX_IMPACT_MAP_EVENTS,
  MAX_IMPACT_MAP_RELATIONSHIPS,
  MAX_IMPACT_MAP_TYPE_FIELDS,
} from './constants';

const MAX_ID_LENGTH = 256;
const MAX_TYPE_ID_LENGTH = 64;
const MAX_LABEL_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_ICON_KEY_LENGTH = 64;
const MAX_SVG_LENGTH = 4_000;
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_ALERT_COUNT = 9_999;
const MAX_METADATA_KEY_LENGTH = 96;
const MAX_METADATA_VALUE_LENGTH = 500;

/**
 * A metadata field's key: lowercase and dotted like an OpenTelemetry attribute, so the same fact
 * (`cloud.availability_zone`) has the same key in every investigation and the table can filter on it.
 */
const metadataKeySchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(MAX_METADATA_KEY_LENGTH)
    .regex(/^[a-z0-9][a-z0-9_.-]*$/, 'Use lowercase letters, digits, "_", "." or "-".')
);

/** A field an entity type is known to carry: what it is called and whether it leads the flyout. */
export const impactMapMetadataFieldSchema = lazySchema(() =>
  z.object({
    key: metadataKeySchema,
    label: z.string().min(1).max(MAX_LABEL_LENGTH),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
    /** Shown on the first page of the entity's flyout, not only in the Metadata tab. */
    featured: z.boolean().optional(),
  })
);
export type ImpactMapMetadataField = z.infer<typeof impactMapMetadataFieldSchema>;

/** One fact about one entity, for example `k8s.namespace.name` = `checkout`. */
export const impactMapMetadataEntrySchema = lazySchema(() =>
  z.object({
    key: metadataKeySchema,
    value: z.string().min(1).max(MAX_METADATA_VALUE_LENGTH),
    /** Overrides the label the type or the standard fields give the key. */
    label: z.string().min(1).max(MAX_LABEL_LENGTH).optional(),
    /** Overrides whether the type shows the field on the first page. */
    featured: z.boolean().optional(),
  })
);
export type ImpactMapMetadataEntry = z.infer<typeof impactMapMetadataEntrySchema>;

/** Lowercase so `Database` and `database` are one type across investigations. */
const typeIdSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(MAX_TYPE_ID_LENGTH)
    .regex(/^[a-z0-9][a-z0-9_.-]*$/, 'Use lowercase letters, digits, "_", "." or "-".')
);

export const impactMapEntityKindSchema = lazySchema(() => z.enum(IMPACT_MAP_STORED_ENTITY_KINDS));
export type ImpactMapEntityKind = z.infer<typeof impactMapEntityKindSchema>;

export const impactMapSourceSchema = lazySchema(() => z.enum(IMPACT_MAP_SOURCES));
export type ImpactMapSource = z.infer<typeof impactMapSourceSchema>;

export const impactMapConfidenceSchema = lazySchema(() => z.enum(IMPACT_MAP_CONFIDENCES));
export type ImpactMapConfidence = z.infer<typeof impactMapConfidenceSchema>;

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
    /** The metadata fields entities of this type usually carry, reused by later investigations. */
    metadata_fields: z
      .array(impactMapMetadataFieldSchema)
      .max(MAX_IMPACT_MAP_TYPE_FIELDS)
      .optional(),
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
    /**
     * The entity this one is part of or sits inside: a pod inside a node, a node inside a zone,
     * a zone inside a region. The map draws it as a box around its members, like a Mermaid
     * subgraph. Must name another entity in the map; a cycle is dropped.
     */
    parent_id: z.string().min(1).max(MAX_ID_LENGTH).optional(),
    /** How the agent learned the entity exists. */
    source: impactMapSourceSchema.optional(),
    confidence: impactMapConfidenceSchema.optional(),
    /** Facts that help a person understand and find the entity: its cloud, zone, cluster, namespace. */
    metadata: z.array(impactMapMetadataEntrySchema).max(MAX_IMPACT_MAP_ENTITY_METADATA).optional(),
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
    /** Overrides the type's label on this edge only, like a Mermaid edge label ("HTTPS :443"). */
    label: z.string().min(1).max(MAX_LABEL_LENGTH).optional(),
    /** How the agent learned of the link; `inferred` links draw dashed. */
    source: impactMapSourceSchema.optional(),
    confidence: impactMapConfidenceSchema.optional(),
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

export const impactMapDataSourceSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(MAX_DATA_SOURCE_NAME_LENGTH),
    instance: z.string().max(MAX_DATA_SOURCE_INSTANCE_LENGTH).optional(),
    scope: z.enum(DATA_SOURCE_SCOPES).optional(),
    base_url: z.string().max(MAX_DATA_SOURCE_URL_LENGTH).optional(),
    query: z
      .object({
        language: z.string().max(40).optional(),
        text: z.string().min(1).max(MAX_DATA_SOURCE_QUERY_LENGTH),
      })
      .optional(),
    api_call: z
      .object({
        method: z.string().max(16).optional(),
        type: z.string().max(100).optional(),
        endpoint: z.string().max(MAX_DATA_SOURCE_ENDPOINT_LENGTH).optional(),
        payload: z.string().max(MAX_DATA_SOURCE_PAYLOAD_LENGTH).optional(),
      })
      .optional(),
  })
);
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
    /** The entity it happened to. A finding or a response may have neither. */
    entity_id: z.string().max(MAX_ID_LENGTH).optional(),
    /** The relationship it happened to, as the map ids it: `source->target`. */
    relationship_id: z.string().max(MAX_ID_LENGTH).optional(),
    evidence: investigationEvidenceSchema.optional(),
    /** Where the event's data came from and how it was asked for; absent when it uses no data. */
    data_source: impactMapDataSourceSchema.optional(),
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
