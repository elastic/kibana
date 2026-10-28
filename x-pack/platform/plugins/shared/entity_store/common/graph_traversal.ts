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

/**
 * Stop the walk once a node matching one of these is admitted: on `entity.id` the values are
 * node ids, on any other field they are matched against the edge payload that reached the node.
 */
export interface GraphTraversalStopCondition {
  field: string;
  values: string[];
}

/** The node ids from the seed to a matched node, both included. */
export interface GraphTraversalRoute {
  id: string;
  route: string[];
}

export interface RunGraphTraversalRequestBody {
  /** Entity store id (EUID) of the entity to start from. */
  entity_id: string;
  scenario_id?: string;
  /** Applied to hops that declare a `time_field`, for example `7d`. */
  lookback?: string;
  max_hops?: number;
  exclusions?: GraphTraversalExclusion[];
  /** Stop once one of these is reached; merged with the scenario's own stop conditions. */
  until?: GraphTraversalStopCondition[];
  /**
   * Run the scenario as one ES|QL `GRAPH EXPAND` statement instead of the workflow. Needs an
   * Elasticsearch snapshot build that has the command.
   */
  esql?: boolean;
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
  /** The stop conditions in force: the scenario's and the run's. */
  until?: GraphTraversalStopCondition[];
  /** Ids of the nodes that matched a stop condition; `stop_reason` is then `until_matched`. */
  until_matches?: string[];
  /** One route per matched node, from the seed. */
  routes?: GraphTraversalRoute[];
}

/**
 * The route from the seed to each target over the traversal's edges, as node ids. Edges are
 * walked in both directions, since a `both` walk keeps stored orientation while a forward
 * chain points away from the seed; the first route found is a shortest one. Targets the
 * edges do not connect to the seed are left out.
 */
export const traceGraphTraversalRoutes = (
  seedId: string,
  edges: ReadonlyArray<Pick<GraphTraversalEdge, 'source' | 'target'>>,
  targets: ReadonlyArray<string>
): GraphTraversalRoute[] => {
  const wanted = new Set(targets);
  if (wanted.size === 0) return [];
  const neighbours = new Map<string, Set<string>>();
  const link = (from: string, to: string) => {
    const set = neighbours.get(from) ?? new Set<string>();
    set.add(to);
    neighbours.set(from, set);
  };
  for (const edge of edges) {
    link(edge.source, edge.target);
    link(edge.target, edge.source);
  }
  const parent = new Map<string, string | null>([[seedId, null]]);
  const queue = [seedId];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const next of neighbours.get(current) ?? []) {
      if (!parent.has(next)) {
        parent.set(next, current);
        queue.push(next);
      }
    }
  }
  const routes: GraphTraversalRoute[] = [];
  for (const target of targets) {
    if (!parent.has(target)) continue;
    const route: string[] = [];
    for (let node: string | null | undefined = target; node != null; node = parent.get(node)) {
      route.unshift(node);
    }
    routes.push({ id: target, route });
  }
  return routes;
};

export interface RunGraphTraversalResponse {
  /** `esql` when the run was one GRAPH EXPAND statement; otherwise the workflow execution id. */
  execution_id: string;
  /** How the traversal ran; absent means the workflow. */
  engine?: 'workflow' | 'esql';
  /** Terminal workflow execution status: `completed`, `failed`, `cancelled` or `timed_out`. */
  status: string;
  /** Present when the execution completed. */
  output: GraphTraversalOutput | null;
  /** Present when the execution did not complete. */
  error?: string;
  duration_ms: number;
}
