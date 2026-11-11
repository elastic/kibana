/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';

/**
 * Shapes shared by the two entity graph traversal step types. They mirror the scenario
 * scenario schema in `./scenarios` but are kept dependency-free so the public (browser)
 * step definitions do not pull the managed workflow YAML into the bundle. The hard ceilings
 * are enforced server-side when the scenario is loaded; these schemas only check shape.
 */

export const ENTITY_GRAPH_TRAVERSAL_FIELD_PATTERN = /^[A-Za-z_@][A-Za-z0-9_.@-]*$/;
export const ENTITY_GRAPH_TRAVERSAL_LOOKBACK_PATTERN = /^[0-9]{1,5}(m|h|d)$/;

/** Entity store entity types (mirrors the store's `EntityType`). */
export const ENTITY_GRAPH_TRAVERSAL_EUID_TYPES = ['user', 'host', 'service', 'generic'] as const;

export type EntityGraphTraversalEuidType = (typeof ENTITY_GRAPH_TRAVERSAL_EUID_TYPES)[number];

/**
 * Which way a hop follows the stored edges: `out` reads the frontier entities' own
 * relationship ids; `in` reaches the entities whose relationship ids point at the frontier,
 * so a walk goes from a resource back to whatever can reach it; `both` does both (mirrors the
 * scenario schema).
 */
export const ENTITY_GRAPH_TRAVERSAL_DIRECTIONS = ['out', 'in', 'both'] as const;

export const traversalDirectionSchema = () =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? 'out' : value),
    z.enum(ENTITY_GRAPH_TRAVERSAL_DIRECTIONS)
  );

export type TraversalDirection = (typeof ENTITY_GRAPH_TRAVERSAL_DIRECTIONS)[number];

const MAX_ID_LENGTH = 2048;
const MAX_IDS = 10_000;

const fieldName = () => z.string().min(1).max(256).regex(ENTITY_GRAPH_TRAVERSAL_FIELD_PATTERN);

/**
 * Accepts the value a `${{ inputs.x }}` template yields when the input was not given
 * (`undefined`, `null` or an empty string) as "not set".
 */
export const optionalPositiveInt = () =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().int().min(1).optional()
  );

const optionalString = () =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.string().optional()
  );

export const traversalLimitOverridesSchema = lazySchema(() =>
  z.object({
    max_hops: optionalPositiveInt(),
    max_nodes: optionalPositiveInt(),
    max_frontier: optionalPositiveInt(),
    max_edges_per_hop: optionalPositiveInt(),
    max_edges_total: optionalPositiveInt(),
    hub_degree: optionalPositiveInt(),
  })
);

export const traversalLimitsSchema = lazySchema(() =>
  z.object({
    max_hops: z.number().int().min(1),
    max_nodes: z.number().int().min(1),
    max_frontier: z.number().int().min(1),
    max_edges_per_hop: z.number().int().min(1),
    max_edges_total: z.number().int().min(1),
    hub_degree: z.number().int().min(1),
  })
);

export type TraversalLimits = z.infer<typeof traversalLimitsSchema>;

/**
 * One expanded hop of a scenario, as the load step emits it and the hop step consumes it.
 * The hop reads the entity store's latest index: the frontier is matched on `match_field`
 * (`entity.id`) and each target field is an `entity.relationships.<key>.ids` array whose
 * values are the ids reached, labelled with the key as the relation.
 */
export const traversalHopSchema = lazySchema(() =>
  z.object({
    hop_number: z.number().int().min(1),
    name: z.string().min(1).max(64),
    match_field: fieldName(),
    target_fields: z
      .array(z.object({ field: fieldName(), relation: z.string().min(1).max(64) }))
      .min(1)
      .max(8),
    payload_fields: z.array(fieldName()).max(5).default([]),
    filter: z
      .string()
      .max(1_000)
      .refine((value) => !/[|\n\r]/.test(value), {
        message: 'filter must be a single ES|QL boolean expression without pipes or newlines',
      })
      .optional(),
    source_type: z.string().max(64).optional(),
    target_type: z.string().max(64).optional(),
  })
);

export type TraversalHop = z.infer<typeof traversalHopSchema>;

export const traversalLookbackSchema = () =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.string().regex(ENTITY_GRAPH_TRAVERSAL_LOOKBACK_PATTERN).optional()
  );

/**
 * Node ids in a traversal are entity ids: the seed is an EUID, generic entities use their
 * `entity.id` as EUID, and relationship fields reference entity ids. An exclusion on this
 * field therefore removes nodes, not only documents.
 */
export const TRAVERSAL_NODE_ID_FIELD = 'entity.id';

const MAX_EXCLUSIONS = 50;
const MAX_EXCLUSION_VALUES = 100;

/** Documents (and, on `entity.id`, nodes) with one of `values` in `field` are left out. */
export const traversalExclusionSchema = lazySchema(() =>
  z.object({
    field: fieldName(),
    values: z.array(z.string().min(1).max(MAX_ID_LENGTH)).min(1).max(MAX_EXCLUSION_VALUES),
  })
);

export type TraversalExclusion = z.infer<typeof traversalExclusionSchema>;

/** Accepts a missing `${{ inputs.exclusions }}` (undefined, null or empty string) as none. */
export const traversalExclusionsSchema = () =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? [] : value),
    z.array(traversalExclusionSchema).max(MAX_EXCLUSIONS)
  );

/**
 * Stop the walk once a node matching one of these is admitted. On `entity.id` the values are
 * node ids; on any other field they are matched against the payload of the edge that reached
 * the node, and the hop reads that field as payload whether or not the scenario lists it in
 * `payload_fields`. Same shape as an exclusion.
 */
export const traversalStopConditionSchema = traversalExclusionSchema;

export type TraversalStopCondition = TraversalExclusion;

/** Accepts a missing `${{ inputs.until }}` (undefined, null or empty string) as none. */
export const traversalStopConditionsSchema = () =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? [] : value),
    z.array(traversalStopConditionSchema).max(MAX_EXCLUSIONS)
  );

export const traversalIdListSchema = lazySchema(() =>
  z.array(z.string().min(1).max(MAX_ID_LENGTH)).max(MAX_IDS)
);

export const traversalEdgeSchema = lazySchema(() =>
  z.object({
    hop: z.number().int().min(1),
    relation: z.string(),
    source: z.string(),
    target: z.string(),
    count: z.number().int().min(0),
    payload: z.record(z.string(), z.array(z.unknown())).optional(),
  })
);

export type TraversalEdge = z.infer<typeof traversalEdgeSchema>;

/** A node the traversal admitted. The seed is `hop: 0, via: 'seed'`. */
export const traversalNodeSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    hop: z.number().int().min(0),
    via: z.string(),
    type: z.string().optional(),
  })
);

export type TraversalNode = z.infer<typeof traversalNodeSchema>;

/** What the entity store knows about a resolved node. */
export const traversalEntitySchema = lazySchema(() =>
  z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    sub_type: z.string().optional(),
    engine_type: z.enum(ENTITY_GRAPH_TRAVERSAL_EUID_TYPES).optional(),
    sources: z.array(z.string()).optional(),
    criticality: z.string().optional(),
    risk_level: z.string().optional(),
    risk_score: z.number().optional(),
  })
);

export type TraversalEntity = z.infer<typeof traversalEntitySchema>;

/**
 * A traversal node after entity store resolution. `euid` is the id the node is known by in
 * the store (the node id itself: seeds are EUIDs and generic entities use their `entity.id`),
 * `resolved` says whether the store has it, and `canonical_euid` is set when the store
 * resolves the entity to another one (an alias).
 */
export const resolvedTraversalNodeSchema = lazySchema(() =>
  traversalNodeSchema.extend({
    euid: z.string(),
    resolved: z.boolean(),
    canonical_euid: z.string().optional(),
    entity: traversalEntitySchema.optional(),
  })
);

export type ResolvedTraversalNode = z.infer<typeof resolvedTraversalNodeSchema>;

/**
 * Why a hop ended the run. Empty while the traversal may continue.
 */
export const TRAVERSAL_STOP_REASONS = [
  '',
  'frontier_exhausted',
  'max_nodes',
  'max_edges_total',
  'until_matched',
] as const;

export type TraversalStopReason = (typeof TRAVERSAL_STOP_REASONS)[number];

export const traversalStopReasonSchema = lazySchema(() => z.enum(TRAVERSAL_STOP_REASONS));

export { optionalString as traversalOptionalString };
