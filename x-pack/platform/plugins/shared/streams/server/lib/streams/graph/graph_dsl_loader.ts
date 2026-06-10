/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 7 — Thin DSL loader: Graph DSL → per-node GraphStream.UpsertRequest[]
 *
 * The Graph DSL (streams_graph_dsl.md) describes a topology as a single document
 * with four node collections (sources, pipelines, destinations) and a shared routing
 * edge list. This module lowers that document into N per-node definitions — one
 * GraphStream.UpsertRequest per node — which the state machine can consume via N
 * PUT /api/streams/{name} calls.
 *
 * Lowering rules:
 *   source      → graph node: processing.steps = [], lifecycle = node.lifecycle ?? inherit
 *   pipeline    → graph node: processing.steps = node.steps, lifecycle = node.lifecycle ?? inherit
 *   destination → graph node: processing.steps = [], lifecycle = node.lifecycle ?? inherit
 *
 *   routing edges: each node's ingest.graph.routing contains the ordered subset of
 *   topology.routing where edge.from === node.id.
 */

import type { Condition, StreamlangDSL } from '@kbn/streamlang';
import { ALWAYS_CONDITION } from '@kbn/streamlang';
import type { IngestStreamLifecycle, RoutingDefinition, RoutingStatus } from '@kbn/streams-schema';
import type { GraphStream } from '@kbn/streams-schema';

type StreamlangStep = StreamlangDSL['steps'][number];

// ---------------------------------------------------------------------------
// DSL types
// ---------------------------------------------------------------------------

export type GraphDslSourceType = 'otlp' | 'async_bulk' | 'prometheus_remote_write';
export type GraphDslDestinationType = 'elasticsearch';

export interface GraphDslSource {
  type: GraphDslSourceType;
  lifecycle?: IngestStreamLifecycle;
}

export interface GraphDslDestination {
  type: GraphDslDestinationType;
  index?: string;
  lifecycle?: IngestStreamLifecycle;
}

export interface GraphDslPipeline {
  steps: StreamlangStep[];
  lifecycle?: IngestStreamLifecycle;
}

export interface GraphDslEdge {
  from: string;
  to: string;
  where?: Condition;
  status?: RoutingStatus;
}

export interface GraphDsl {
  name: string;
  sources?: Record<string, GraphDslSource>;
  destinations?: Record<string, GraphDslDestination>;
  pipelines?: Record<string, GraphDslPipeline>;
  routing: GraphDslEdge[];
}

// ---------------------------------------------------------------------------
// Converter
// ---------------------------------------------------------------------------

const defaultLifecycle: IngestStreamLifecycle = { inherit: {} };

/**
 * Converts a Graph DSL document into N per-node GraphStream upsert requests.
 * Returns one entry per node id, ordered: sources first, then pipelines, then destinations.
 */
export function graphDslToDefinitions(dsl: GraphDsl): Array<{ name: string; request: GraphStream.UpsertRequest }> {
  const results: Array<{ name: string; request: GraphStream.UpsertRequest }> = [];

  // Build per-node routing index: nodeId → ordered outbound edges
  const routingByNode = new Map<string, RoutingDefinition[]>();
  for (const edge of dsl.routing) {
    if (!routingByNode.has(edge.from)) routingByNode.set(edge.from, []);
    routingByNode.get(edge.from)!.push({
      destination: edge.to,
      // No where clause = unconditional fallthrough (always routes); { never: {} } = never routes.
      where: edge.where ?? ALWAYS_CONDITION,
      status: edge.status ?? 'enabled',
    });
  }

  const makeRequest = (
    id: string,
    steps: StreamlangStep[],
    lifecycle: IngestStreamLifecycle
  ): { name: string; request: GraphStream.UpsertRequest } => ({
    name: id,
    request: {
      dashboards: [],
      rules: [],
      queries: [],
      stream: {
        type: 'graph',
        description: `Graph stream node: ${id}`,
        ingest: {
          lifecycle,
          processing: { steps },
          settings: {},
          graph: {
            fields: {},
            routing: routingByNode.get(id) ?? [],
          },
          failure_store: { inherit: {} },
        },
      },
    },
  });

  for (const [id, node] of Object.entries(dsl.sources ?? {})) {
    results.push(makeRequest(id, [], node.lifecycle ?? defaultLifecycle));
  }

  for (const [id, node] of Object.entries(dsl.pipelines ?? {})) {
    results.push(makeRequest(id, node.steps, node.lifecycle ?? defaultLifecycle));
  }

  for (const [id, node] of Object.entries(dsl.destinations ?? {})) {
    results.push(makeRequest(id, [], node.lifecycle ?? defaultLifecycle));
  }

  return results;
}

/**
 * Returns the full set of node ids referenced in the DSL (sources + pipelines + destinations).
 */
export function graphDslNodeIds(dsl: GraphDsl): string[] {
  return [
    ...Object.keys(dsl.sources ?? {}),
    ...Object.keys(dsl.pipelines ?? {}),
    ...Object.keys(dsl.destinations ?? {}),
  ];
}
