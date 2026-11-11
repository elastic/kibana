/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scenarios the UI runs until scenarios become selectable, by the type the seed EUID
 * declares in its prefix. Scenarios are defined in `./scenarios`.
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

/** How a traversal runs: the managed workflow, or one ES|QL `GRAPH EXPAND` statement. */
/**
 * `hops` walks the graph in process, one ES|QL query per relationship field per hop; `esql`
 * runs the scenario as one `GRAPH EXPAND` statement.
 */
export type GraphTraversalEngine = 'hops' | 'esql';

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
   * Run the scenario as one ES|QL `GRAPH EXPAND` statement instead of hop by hop. Needs an
   * Elasticsearch snapshot build that has the command.
   */
  esql?: boolean;
  /**
   * Read relationships from the entity store's edge documents (one document per edge in the
   * space's edges index) instead of the relationship arrays on the entity documents.
   */
  edge_documents?: boolean;
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
  /** Hop engine only: what each hop did and how long it took. */
  hops?: GraphTraversalHopStats[];
}

/** One hop of the hop engine, for the API caller: counts and timings, in milliseconds. */
export interface GraphTraversalHopStats {
  hop_number: number;
  name: string;
  frontier_size: number;
  /** New nodes the hop refused because it had already admitted `max_frontier` (they would have been the next frontier). */
  dropped_frontier: number;
  /** Frontier ids removed by an `entity.id` exclusion. */
  excluded_frontier: number;
  queries: number;
  rows_returned: number;
  /**
   * Relationships the hop's queries matched at the index, before the hub cap kept at most
   * `hub_degree + 1` per node; the read volume behind `rows_returned`.
   */
  relationships_read: number;
  edges_added: number;
  /** Edges cut by the run's edge budget. */
  dropped_edges: number;
  /** Edges removed because one end is excluded. */
  excluded_edges: number;
  /** Edges onto nodes already reached; they admit no node. */
  closing_edges: number;
  /** Nodes admitted this hop that matched a stop condition. */
  until_matched: number;
  /** Frontier nodes refused for reaching more than `hub_degree` distinct nodes. */
  hubs_skipped: string[];
  new_nodes: number;
  /** The whole hop: its queries, parsing and bounding. */
  hop_ms: number;
  /** From issuing the hop's queries together to the last response parsed. */
  query_ms: number;
  /** Time Elasticsearch reports for the hop's queries (`took`), summed. */
  es_took_ms: number;
  /** Each query's `took`, in the order the queries were issued (fields, then the inbound leg). */
  es_took_per_query: number[];
}

/** Where a hop engine run spent its time, in milliseconds. */
export interface GraphTraversalHopTimings {
  /** Resolving the concrete lookup-join index, once per run. */
  resolve_index_ms: number;
  /** Every hop, from the first query to the last admission. */
  hops_ms: number;
  /** The hops' queries round trip, summed. */
  query_ms: number;
  /** Time Elasticsearch reports for the hops' queries (`took`), summed. */
  es_took_ms: number;
  /** Resolving every node against the entity store after the walk. */
  resolve_nodes_ms: number;
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

/** Where an ES|QL engine run spent its time, in milliseconds. */
export interface GraphTraversalTimings {
  /** Resolving the concrete lookup-join index before the statement is built. */
  resolve_index_ms: number;
  /** The GRAPH EXPAND statement, from request to parsed response. */
  statement_ms: number;
  /**
   * Time Elasticsearch reports it spent on the statement (`took`), when the response carries
   * it; `statement_ms` minus this is transport and client cost. Per-hop subplan timings are
   * logged by Elasticsearch, not returned.
   */
  statement_took_ms?: number;
  /** The seed entity lookup, which runs alongside the statement. */
  seed_lookup_ms: number;
  /** Mapping the result rows into nodes, edges and routes. */
  map_ms: number;
}

export interface RunGraphTraversalResponse {
  /** `esql` for one GRAPH EXPAND statement, `hops` for the in-process hop engine. */
  execution_id: string;
  /** How the traversal ran. */
  engine?: GraphTraversalEngine;
  /** True when relationships were read from edge documents rather than entity arrays. */
  edge_documents?: boolean;
  /** `completed` when the output is present; a failed run is reported as an error response. */
  status: string;
  /** Present when the execution completed. */
  output: GraphTraversalOutput | null;
  /** Present when the execution did not complete. */
  error?: string;
  duration_ms: number;
  /** Where the run spent its time, by engine. */
  timings?: GraphTraversalTimings | GraphTraversalHopTimings;
}
