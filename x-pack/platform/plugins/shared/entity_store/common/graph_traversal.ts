/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scenarios the UI runs until scenarios become selectable, by the type the seed EUID
 * declares in its prefix. Scenarios are defined next to the
 * `system-security-entity-graph-traversal` managed workflow in `@kbn/workflows/managed`.
 */
export const DEFAULT_GRAPH_TRAVERSAL_SCENARIO_ID = 'okta-user-to-aws-resources';
export const HOST_GRAPH_TRAVERSAL_SCENARIO_ID = 'endpoint-shared-indicator-spread';

/** The scenario to run for a seed when the request names none: by the EUID's type prefix. */
export const getDefaultGraphTraversalScenarioId = (entityId: string): string =>
  entityId.startsWith('host:')
    ? HOST_GRAPH_TRAVERSAL_SCENARIO_ID
    : DEFAULT_GRAPH_TRAVERSAL_SCENARIO_ID;

/**
 * Documents with one of `values` in `field` are left out of every hop. On `entity.id` the
 * values also remove those nodes from the traversal, since node ids are entity ids.
 */
export interface GraphTraversalExclusion {
  field: string;
  values: string[];
}

export interface RunGraphTraversalRequestBody {
  /** Entity store id (EUID) of the entity to start from. */
  entity_id: string;
  scenario_id?: string;
  /** Applied to hops that declare a `time_field`, for example `7d`. */
  lookback?: string;
  max_hops?: number;
  exclusions?: GraphTraversalExclusion[];
}

/** What the entity store knows about a traversed node, from the workflow's resolve step. */
export interface GraphTraversalEntity {
  name?: string;
  type?: string;
  sub_type?: string;
  engine_type?: 'user' | 'host' | 'service' | 'generic';
  sources?: string[];
  criticality?: string;
  risk_level?: string;
  risk_score?: number;
}

/**
 * One node the traversal admitted; the seed is `hop: 0, via: 'seed'`. The resolution fields
 * are present once the workflow has looked the node up in the entity store.
 */
export interface GraphTraversalNode {
  id: string;
  hop: number;
  via: string;
  type?: string;
  /** Id the node is known by in the entity store (the node id for seeds and generic entities). */
  euid?: string;
  /** Whether the entity store has the node. */
  resolved?: boolean;
  /** Set when the stored entity is an alias that resolves to another entity. */
  canonical_euid?: string;
  entity?: GraphTraversalEntity;
}

export interface GraphTraversalEdge {
  hop: number;
  relation: string;
  source: string;
  target: string;
  count: number;
  payload?: Record<string, unknown[]>;
}

/** The `workflow.output` of the traversal workflow. */
export interface GraphTraversalOutput {
  scenario_id: string;
  scenario_name: string;
  seed_id: string;
  hops_planned: number;
  hops_executed: number;
  stop_reason: string;
  truncated: boolean;
  node_count: number;
  edge_count: number;
  nodes: GraphTraversalNode[];
  edges: GraphTraversalEdge[];
  limits?: Record<string, number>;
  /** The exclusions the run was given. */
  exclusions?: GraphTraversalExclusion[];
}

export interface RunGraphTraversalResponse {
  execution_id: string;
  /** Terminal workflow execution status: `completed`, `failed`, `cancelled` or `timed_out`. */
  status: string;
  /** Present when the execution completed. */
  output: GraphTraversalOutput | null;
  /** Present when the execution did not complete. */
  error?: string;
  duration_ms: number;
}
