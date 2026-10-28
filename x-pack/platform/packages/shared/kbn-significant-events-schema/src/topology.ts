/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoDateTime, lazySchema, z } from '@kbn/zod/v4';
import { MAX_ID_LENGTH, MAX_TITLE_LENGTH } from './significant_events/constants';

export const MAX_TOPOLOGY_NODES = 2_000;
export const MAX_TOPOLOGY_EDGES = 5_000;
export const MAX_TOPOLOGY_PROVENANCE = 20;

export const TOPOLOGY_NODE_TYPES = ['entity', 'infrastructure'] as const;
export type TopologyNodeType = (typeof TOPOLOGY_NODE_TYPES)[number];

/** How a dependency endpoint was matched to a node, strongest first. */
export const TOPOLOGY_EDGE_RESOLUTIONS = ['slug', 'name', 'technology', 'unresolved'] as const;
export type TopologyEdgeResolution = (typeof TOPOLOGY_EDGE_RESOLUTIONS)[number];

export const topologyProvenanceSchema = lazySchema(() =>
  z.object({
    source_id: z.string().max(MAX_ID_LENGTH),
    feature_id: z.string().max(MAX_ID_LENGTH),
    feature_uuid: z.string().max(MAX_ID_LENGTH),
    confidence: z.number().min(0).max(100),
  })
);

export type TopologyProvenance = z.infer<typeof topologyProvenanceSchema>;

export const topologyNodeSchema = lazySchema(() =>
  z.object({
    /** Normalized feature slug, the id events store in `causal_features` / `blast_radius`. */
    node_id: z.string().max(MAX_ID_LENGTH),
    node_type: z.enum(TOPOLOGY_NODE_TYPES),
    subtype: z.string().max(MAX_ID_LENGTH).optional(),
    title: z.string().max(MAX_TITLE_LENGTH).optional(),
    name: z.string().max(MAX_ID_LENGTH).optional(),
    technology: z.string().max(MAX_ID_LENGTH).optional(),
    provenance: z.array(topologyProvenanceSchema).max(MAX_TOPOLOGY_PROVENANCE),
  })
);

export type TopologyNode = z.infer<typeof topologyNodeSchema>;

export const topologyEdgeSchema = lazySchema(() =>
  z.object({
    edge_id: z.string().max(MAX_ID_LENGTH),
    subtype: z.string().max(MAX_ID_LENGTH).optional(),
    protocol: z.string().max(MAX_ID_LENGTH).optional(),
    /** Raw `properties.source` / `properties.target` of the dependency feature. */
    source_ref: z.string().max(MAX_ID_LENGTH),
    target_ref: z.string().max(MAX_ID_LENGTH),
    source_node_id: z.string().max(MAX_ID_LENGTH).nullable(),
    target_node_id: z.string().max(MAX_ID_LENGTH).nullable(),
    source_resolution: z.enum(TOPOLOGY_EDGE_RESOLUTIONS),
    target_resolution: z.enum(TOPOLOGY_EDGE_RESOLUTIONS),
    provenance: z.array(topologyProvenanceSchema).max(MAX_TOPOLOGY_PROVENANCE),
  })
);

export type TopologyEdge = z.infer<typeof topologyEdgeSchema>;

/** Service topology computed from the entity, infrastructure and dependency KIs of `source_ids`. */
export const topologySnapshotPropertiesSchema = lazySchema(() =>
  z.object({
    built_at: isoDateTime(),
    source_ids: z.array(z.string().max(MAX_ID_LENGTH)),
    nodes: z.array(topologyNodeSchema).max(MAX_TOPOLOGY_NODES),
    edges: z.array(topologyEdgeSchema).max(MAX_TOPOLOGY_EDGES),
    node_count: z.number().int().min(0),
    edge_count: z.number().int().min(0),
    truncated: z.boolean(),
  })
);

export type TopologySnapshotProperties = z.infer<typeof topologySnapshotPropertiesSchema>;

export interface TopologySnapshotSummary {
  built_at: string;
  node_count: number;
  edge_count: number;
  truncated: boolean;
}
