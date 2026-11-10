/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type {
  TraversalDirection,
  TraversalExclusion,
  TraversalStopCondition,
  TraversalEdge,
  TraversalHop,
  TraversalLimits,
  TraversalNode,
  TraversalStopReason,
} from '../../../../common/graph_traversal/hop_types';
import { TRAVERSAL_NODE_ID_FIELD } from '../../../../common/graph_traversal/hop_types';
import {
  buildHopQuery,
  HOP_COUNT_COLUMN,
  HOP_SOURCE_COLUMN,
  HOP_TARGET_COLUMN,
  hopPayloadColumn,
  type HopQuery,
} from './build_hop_query';

export interface EsqlResult {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
  /** Milliseconds Elasticsearch reports it spent on the query, when the response carries it. */
  took?: number;
}

export type ExecuteHopQuery = (query: HopQuery) => Promise<EsqlResult>;

export interface RunHopInput {
  hop: TraversalHop;
  /** The entity store's latest index pattern for the execution space. */
  index: string;
  /**
   * The concrete latest entity index of the space, joined in an outbound query so the
   * payload fields describe the reached node. Without it, they describe the frontier node.
   */
  lookupIndex?: string;
  direction: TraversalDirection;
  frontier: string[];
  visited: string[];
  edgesSoFar: number;
  truncatedSoFar: boolean;
  limits: TraversalLimits;
  lookback?: string;
  exclusions?: TraversalExclusion[];
  until?: TraversalStopCondition[];
}

export interface RunHopStats {
  frontier_size: number;
  frontier_expanded: number;
  dropped_frontier: number;
  queries: number;
  /** Always 0 since a hop's queries are issued together; kept so the stats shape is stable. */
  queries_skipped: number;
  rows_returned: number;
  edges_added: number;
  dropped_edges: number;
  /** Frontier ids removed by an `entity.id` exclusion. */
  excluded_frontier: number;
  /** Edges removed because one of their ends is excluded on `entity.id`. */
  excluded_edges: number;
  /** Nodes admitted this hop that matched a stop condition. */
  until_matched: number;
  /** Edges onto visited nodes that arrived despite the query filtering them; they admit no node. */
  closing_edges: number;
  new_nodes: number;
  hubs_skipped: string[];
  /** Milliseconds spent before the first query: resolving the space and the lookup index. */
  setup_ms: number;
  /** Milliseconds from issuing the hop's queries together to the last response parsed. */
  query_ms: number;
  /** Milliseconds Elasticsearch reports it spent on the hop's queries (`took`), summed. */
  es_took_ms: number;
}

export interface RunHopResult {
  hop_number: number;
  hop_name: string;
  edges: TraversalEdge[];
  /** The nodes this hop admitted, unresolved: the loop carries them, so they stay small. */
  nodes: TraversalNode[];
  next_frontier: string[];
  visited: string[];
  until_matches: string[];
  truncated: boolean;
  stop_reason: TraversalStopReason;
  stats: RunHopStats;
}

/**
 * An edge as a hop query returned it, in stored orientation (`source` holds the relationship
 * field, `target` is the id it points at), with the end that lies on the frontier and the
 * end the edge reaches: the target on an outbound leg, the source on an inbound one.
 */
interface CollectedEdge {
  edge: TraversalEdge;
  frontierNode: string;
  reached: string;
  inbound: boolean;
}

const toId = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

const toCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 1;

/**
 * Parse one ES|QL result into edges. Rows whose frontier end is not in the frontier are
 * dropped (a multi-valued match field can produce them).
 */
const parseRows = ({
  result,
  hop,
  relation,
  frontier,
  inbound,
}: {
  result: EsqlResult;
  hop: TraversalHop;
  relation: string;
  frontier: Set<string>;
  inbound: boolean;
}): CollectedEdge[] => {
  const columnIndex = (name: string): number => result.columns.findIndex((c) => c.name === name);
  const sourceIdx = columnIndex(HOP_SOURCE_COLUMN);
  const targetIdx = columnIndex(HOP_TARGET_COLUMN);
  const countIdx = columnIndex(HOP_COUNT_COLUMN);
  if (sourceIdx < 0 || targetIdx < 0) {
    throw new Error(
      `Hop "${hop.name}" query returned no ${HOP_SOURCE_COLUMN}/${HOP_TARGET_COLUMN} columns`
    );
  }
  const payloadColumns = hop.payload_fields
    .map((field, index) => ({ field, idx: columnIndex(hopPayloadColumn(index)) }))
    .filter(({ idx }) => idx >= 0);

  const edges: CollectedEdge[] = [];
  for (const row of result.values) {
    const source = toId(row[sourceIdx]);
    const target = toId(row[targetIdx]);
    const frontierNode = inbound ? target : source;
    const onFrontier =
      source !== undefined && target !== undefined && frontier.has(frontierNode ?? '');
    if (onFrontier) {
      const payloadEntries = payloadColumns
        .map(({ field, idx }) => [field, row[idx]] as const)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([field, value]) => [field, Array.isArray(value) ? value : [value]] as const);
      const payload = payloadEntries.length > 0 ? Object.fromEntries(payloadEntries) : undefined;

      edges.push({
        edge: {
          hop: hop.hop_number,
          relation,
          source,
          target,
          count: countIdx >= 0 ? toCount(row[countIdx]) : 1,
          ...(payload && { payload }),
        },
        frontierNode: frontierNode as string,
        reached: inbound ? source : target,
        inbound,
      });
    }
  }
  return edges;
};

/**
 * The hop with every field a stop condition names added to its payload fields. A condition
 * on a field is matched against the edge payload, so the query has to read that field, or
 * the condition could never fire. `entity.id` is matched on the reached id and needs no
 * payload.
 */
export const withStopConditionFields = (
  hop: TraversalHop,
  until: TraversalStopCondition[]
): TraversalHop => {
  const missing = until
    .map(({ field }) => field)
    .filter((field) => field !== TRAVERSAL_NODE_ID_FIELD && !hop.payload_fields.includes(field));
  if (missing.length === 0) return hop;
  return { ...hop, payload_fields: [...hop.payload_fields, ...new Set(missing)] };
};

/**
 * Whether the node an edge admits matches a stop condition: by id on `entity.id`, otherwise
 * by a value of that field in the edge payload, which `withStopConditionFields` guarantees
 * the hop read.
 */
const matchesStopCondition = (
  { edge, reached }: CollectedEdge,
  until: TraversalStopCondition[]
): boolean =>
  until.some(({ field, values }) => {
    if (field === TRAVERSAL_NODE_ID_FIELD) return values.includes(reached);
    const payload = edge.payload?.[field];
    return (
      Array.isArray(payload) && payload.some((v) => typeof v === 'string' && values.includes(v))
    );
  });

/** Frontier nodes that reach more distinct nodes than `hubDegree`. */
const findHubs = (edges: CollectedEdge[], hubDegree: number): Set<string> => {
  const reachedByFrontier = new Map<string, Set<string>>();
  for (const { frontierNode, reached } of edges) {
    const reachedSet = reachedByFrontier.get(frontierNode) ?? new Set<string>();
    reachedSet.add(reached);
    reachedByFrontier.set(frontierNode, reachedSet);
  }
  const hubs = new Set<string>();
  for (const [frontierNode, reachedSet] of reachedByFrontier) {
    if (reachedSet.size > hubDegree) hubs.add(frontierNode);
  }
  return hubs;
};

/** Timings are reported to a tenth of a millisecond. */
const roundMs = (ms: number): number => Math.round(ms * 10) / 10;

/** Drop edges of hub frontier nodes and repeated (relation, source, target) triples. */
const dedupeEdges = (edges: CollectedEdge[], hubs: Set<string>): CollectedEdge[] => {
  const seen = new Set<string>();
  return edges.filter(({ edge, frontierNode }) => {
    if (hubs.has(frontierNode)) return false;
    const key = `${edge.relation}\u0000${edge.source}\u0000${edge.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Expand one hop over the entity store's latest index. Pure apart from `execute`, so the
 * bounding logic is unit-testable without Elasticsearch.
 *
 * Order of operations, each a circuit breaker on its own:
 * 1. Frontier beyond `max_frontier` is dropped before any query.
 * 2. Remaining node and edge capacity is checked before any query; none left means stop.
 * 3. One query per relationship field, outbound; with direction `both`, one more per field
 *    inbound. Each is capped by `LIMIT` at the smaller of `max_edges_per_hop` and the edge
 *    capacity the edges collected so far leave unfilled, and no further query is issued once
 *    that capacity is full, since nothing more could be admitted. So a hop never holds more
 *    rows than it can admit, plus the repeats a `both` walk reads from each side.
 * 4. Frontier nodes reaching more distinct nodes than `hub_degree` are dropped (hubs).
 * 5. Edges are deduplicated and capped by the remaining edge capacity.
 * 6. New nodes are capped by the remaining node capacity; nodes already visited only
 *    produce closing edges.
 * 7. Stop conditions are tested on the admitted nodes; the fields they name are read as
 *    payload by every query, so a condition on a field the scenario did not list still fires.
 *
 * Edges keep the stored orientation: the source is the entity whose relationship field holds
 * the edge, whichever end the hop reached it from. Nodes come back unresolved (id, hop, via,
 * type): the loop carries them from hop to hop, so they stay small, and the workflow resolves
 * them once after the traversal.
 */
export const runHop = async (
  input: RunHopInput,
  execute: ExecuteHopQuery
): Promise<RunHopResult> => {
  const { index, lookupIndex, direction, limits, lookback, exclusions = [], until = [] } = input;
  const hop = withStopConditionFields(input.hop, until);
  const visitedSet = new Set(input.visited);
  const excludedIds = new Set(
    exclusions.filter((e) => e.field === TRAVERSAL_NODE_ID_FIELD).flatMap((e) => e.values)
  );
  const distinctFrontier = Array.from(new Set(input.frontier));
  const uniqueFrontier = distinctFrontier.filter((id) => !excludedIds.has(id));
  let truncated = input.truncatedSoFar;
  let stopReason: TraversalStopReason = '';

  const stats: RunHopStats = {
    frontier_size: distinctFrontier.length,
    frontier_expanded: 0,
    dropped_frontier: 0,
    queries: 0,
    queries_skipped: 0,
    rows_returned: 0,
    edges_added: 0,
    dropped_edges: 0,
    excluded_frontier: distinctFrontier.length - uniqueFrontier.length,
    excluded_edges: 0,
    until_matched: 0,
    closing_edges: 0,
    new_nodes: 0,
    hubs_skipped: [],
    setup_ms: 0,
    query_ms: 0,
    es_took_ms: 0,
  };

  const untilMatches: string[] = [];
  const finish = (edges: TraversalEdge[], nodes: TraversalNode[]): RunHopResult => ({
    hop_number: hop.hop_number,
    hop_name: hop.name,
    edges,
    nodes,
    next_frontier: nodes.map((n) => n.id),
    visited: Array.from(visitedSet),
    until_matches: untilMatches,
    truncated,
    stop_reason: stopReason,
    stats,
  });

  if (uniqueFrontier.length === 0) {
    stopReason = 'frontier_exhausted';
    return finish([], []);
  }

  // 1. Frontier cap
  const frontier = uniqueFrontier.slice(0, limits.max_frontier);
  stats.dropped_frontier = uniqueFrontier.length - frontier.length;
  if (stats.dropped_frontier > 0) truncated = true;
  stats.frontier_expanded = frontier.length;
  const frontierSet = new Set(frontier);

  // 2. Remaining capacity
  const nodeCapacity = limits.max_nodes - visitedSet.size;
  const edgeCapacity = limits.max_edges_total - input.edgesSoFar;
  if (edgeCapacity <= 0) {
    stopReason = 'max_edges_total';
    truncated = true;
    return finish([], []);
  }
  if (nodeCapacity <= 0) {
    stopReason = 'max_nodes';
    truncated = true;
    return finish([], []);
  }

  // 3. One query per relationship field and leg, all issued together so the hop waits for its
  //    slowest query rather than the sum. Each is capped at the smaller of max_edges_per_hop
  //    and the whole unfilled edge budget: what a sibling returns is not known in advance, so
  //    the edge cap below trims any overshoot. Results are read back in field and leg order,
  //    so admission under the caps is the same as when they ran one after another.
  const legs = direction === 'both' ? [false, true] : [false];
  const limit = Math.min(limits.max_edges_per_hop, edgeCapacity);
  const requests = legs.flatMap((inbound) =>
    hop.target_fields.map(({ field, relation }) => ({
      inbound,
      relation,
      query: buildHopQuery({
        hop,
        index,
        lookupIndex,
        targetField: field,
        frontier,
        limit,
        lookback,
        exclusions,
        visited: input.visited,
        hubDegree: limits.hub_degree,
        inbound,
      }),
    }))
  );
  const queriesStartedAt = performance.now();
  const results = await Promise.all(requests.map(({ query }) => execute(query)));
  stats.query_ms = roundMs(performance.now() - queriesStartedAt);
  const collected: CollectedEdge[] = [];
  requests.forEach(({ inbound, relation }, position) => {
    const result = results[position];
    if (typeof result.took === 'number') stats.es_took_ms += result.took;
    stats.queries += 1;
    stats.rows_returned += result.values.length;
    if (result.values.length >= limit) truncated = true;
    collected.push(...parseRows({ result, hop, relation, frontier: frontierSet, inbound }));
  });

  // 4. Excluded nodes (the query already left out excluded documents and pointer values;
  //    this covers whichever end the query could not filter)
  const kept = collected.filter(
    ({ edge }) => !excludedIds.has(edge.source) && !excludedIds.has(edge.target)
  );
  stats.excluded_edges = collected.length - kept.length;

  // 5. Hub exclusion
  const hubs = findHubs(kept, limits.hub_degree);
  if (hubs.size > 0) {
    truncated = true;
    stats.hubs_skipped = Array.from(hubs);
  }

  // 6. Dedupe and edge cap. Edges onto visited nodes are filtered inside the hop query; any
  //    that still arrive are counted below as closing edges. In a `both` walk such an edge was
  //    recorded from the other node's side when it was expanded, so it is dropped as a repeat.
  const deduped = dedupeEdges(kept, hubs).filter(
    ({ reached }) => direction !== 'both' || !visitedSet.has(reached)
  );
  const admittedEdges = deduped.slice(0, edgeCapacity);
  stats.dropped_edges = deduped.length - admittedEdges.length;
  stats.edges_added = admittedEdges.length;
  if (stats.dropped_edges > 0) {
    truncated = true;
    stopReason = 'max_edges_total';
  }

  // 7. New nodes and node cap
  const nodes: TraversalNode[] = [];
  const admitted = new Set<string>();
  let nodeCapHit = false;
  for (const collectedEdge of admittedEdges) {
    const { edge, reached, inbound } = collectedEdge;
    if (visitedSet.has(reached)) {
      stats.closing_edges += 1;
    } else if (!admitted.has(reached)) {
      if (nodes.length >= nodeCapacity) {
        nodeCapHit = true;
      } else {
        admitted.add(reached);
        // Reached on the pointed side, the node is the hop's target type; reached as the
        // holder of the relationship (inbound), it is the source type.
        const type = inbound ? hop.source_type : hop.target_type;
        nodes.push({ id: reached, hop: hop.hop_number, via: edge.relation, ...(type && { type }) });
        if (until.length > 0 && matchesStopCondition(collectedEdge, until)) {
          untilMatches.push(reached);
        }
      }
    }
  }
  for (const node of nodes) visitedSet.add(node.id);
  stats.new_nodes = nodes.length;
  // 8. Stop conditions: the hop that admits a matching node is the last one. The whole hop is
  //    kept (hops are unordered), so the result holds the match and its context.
  stats.until_matched = untilMatches.length;
  if (untilMatches.length > 0) {
    stopReason = 'until_matched';
  }
  if (nodeCapHit) {
    truncated = true;
    if (stopReason === '') stopReason = 'max_nodes';
  }
  if (stopReason === '' && nodes.length === 0) {
    stopReason = 'frontier_exhausted';
  }

  return finish(
    admittedEdges.map(({ edge }) => edge),
    nodes
  );
};
