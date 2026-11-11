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
  HOP_READ_COLUMN,
  HOP_SOURCE_COLUMN,
  HOP_TARGET_COLUMN,
  hopPayloadColumn,
  type HopQuery,
} from './build_hop_query';
import { buildEdgeHopQuery, HOP_RELATION_COLUMN } from './build_edge_hop_query';

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
  /**
   * The space's edges index. When set, relationships are read as edge documents (`src`,
   * `kind`, `dst`), one query per leg covering every kind of the hop, instead of the
   * relationship arrays on the entity documents.
   */
  edgesIndex?: string;
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
  /** New nodes refused because the hop had already admitted `max_frontier`. */
  dropped_frontier: number;
  queries: number;
  /** Always 0 since a hop's queries are issued together; kept so the stats shape is stable. */
  queries_skipped: number;
  rows_returned: number;
  /**
   * Relationships the hop's queries matched at the index, before the hub cap kept at most
   * `hub_degree + 1` per node (and kind): a capped group's rows carry its count, counted once;
   * every other row is one relationship.
   */
  relationships_read: number;
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
  /** Each query's `took` in issue order, since `es_took_ms` no longer tells them apart. */
  es_took_per_query: number[];
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
  /** How many relationships the row's (frontier node, relation) group matched, when capped. */
  read?: number;
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
  /** The relation of every row; absent when each row carries its own in `__relation`. */
  relation?: string;
  frontier: Set<string>;
  inbound: boolean;
}): CollectedEdge[] => {
  const columnIndex = (name: string): number => result.columns.findIndex((c) => c.name === name);
  const sourceIdx = columnIndex(HOP_SOURCE_COLUMN);
  const targetIdx = columnIndex(HOP_TARGET_COLUMN);
  const countIdx = columnIndex(HOP_COUNT_COLUMN);
  const relationIdx = columnIndex(HOP_RELATION_COLUMN);
  const readIdx = columnIndex(HOP_READ_COLUMN);
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
          relation: relation ?? toId(row[relationIdx]) ?? 'related_to',
          source,
          target,
          count: countIdx >= 0 ? toCount(row[countIdx]) : 1,
          ...(payload && { payload }),
        },
        frontierNode: frontierNode as string,
        reached: inbound ? source : target,
        inbound,
        ...(readIdx >= 0 && typeof row[readIdx] === 'number' && { read: row[readIdx] as number }),
      });
    }
  }
  return edges;
};

/**
 * Relationships the queries matched before any cap: a capped (frontier node, relation) group
 * reports its count on every row it kept, counted once; a row without one is one relationship.
 */
const relationshipsRead = (edges: CollectedEdge[]): number => {
  const counted = new Set<string>();
  let read = 0;
  for (const { edge, frontierNode, read: groupRead } of edges) {
    if (groupRead === undefined) {
      read += 1;
      continue;
    }
    const key = `${frontierNode}\u0000${edge.relation}`;
    if (!counted.has(key)) {
      counted.add(key);
      read += groupRead;
    }
  }
  return read;
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

/**
 * Keep edges for at most `maxFrontier` and at most `nodeCapacity` distinct new nodes, in the
 * rows' order, as the GRAPH EXPAND driver's `max_frontier` and `max_nodes` caps do. Closing
 * edges (onto a node already visited) and further edges onto a kept new node are free. Nodes
 * refused by the frontier cap and by the node cap are counted apart, so the stats say which
 * cap bound.
 */
const capNewNodes = (
  rows: CollectedEdge[],
  visited: Set<string>,
  maxFrontier: number,
  nodeCapacity: number
): { rows: CollectedEdge[]; droppedByFrontier: number; droppedByNodes: number } => {
  const keptNew = new Set<string>();
  const refused = new Set<string>();
  let droppedByFrontier = 0;
  let droppedByNodes = 0;
  const kept: CollectedEdge[] = [];
  for (const row of rows) {
    const { reached } = row;
    if (visited.has(reached) || keptNew.has(reached)) {
      kept.push(row);
      continue;
    }
    if (refused.has(reached)) continue;
    if (keptNew.size >= maxFrontier) {
      refused.add(reached);
      droppedByFrontier += 1;
      continue;
    }
    if (keptNew.size >= nodeCapacity) {
      refused.add(reached);
      droppedByNodes += 1;
      continue;
    }
    keptNew.add(reached);
    kept.push(row);
  }
  return { rows: kept, droppedByFrontier, droppedByNodes };
};

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
 * Order of operations, the GRAPH EXPAND driver's, so both engines admit the same nodes under
 * the same caps:
 * 1. The whole frontier is expanded: the previous hop admitted at most `max_frontier` nodes.
 * 2. Remaining node and edge capacity is checked before any query; none left means stop.
 * 3. One query per relationship field, outbound; with direction `both`, one more per field
 *    inbound. Each is capped by `LIMIT` at the smaller of `max_edges_per_hop` and the edge
 *    capacity the edges collected so far leave unfilled, and no further query is issued once
 *    that capacity is full, since nothing more could be admitted. So a hop never holds more
 *    rows than it can admit, plus the repeats a `both` walk reads from each side.
 * 4. The rows are ordered by the node they reach, so every cap below keeps the same rows
 *    whatever order the queries returned them in.
 * 5. Frontier nodes reaching more distinct nodes than `hub_degree` are dropped (hubs).
 * 6. Edges are deduplicated.
 * 7. New nodes are capped at `max_frontier` for the hop and at the remaining node capacity
 *    for the run; nodes already visited only produce closing edges.
 * 8. The edges kept are capped by the remaining edge capacity.
 * 9. Stop conditions are tested on the admitted nodes; the fields they name are read as
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
  const {
    index,
    lookupIndex,
    edgesIndex,
    direction,
    limits,
    lookback,
    exclusions = [],
    until = [],
  } = input;
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
    relationships_read: 0,
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
    es_took_per_query: [],
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

  // 1. The frontier is expanded whole. `max_frontier` is applied below, when this hop's new
  //    nodes are admitted, so the next frontier never holds more than that: the GRAPH EXPAND
  //    driver's rule, which keeps the two engines on the same walk under the same caps. The
  //    seed is the only frontier that was never admitted under the cap.
  const frontier = uniqueFrontier;
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
  //    Over edge documents a kind is a value, so one query per leg covers every kind of the
  //    hop and each row names its own relation.
  const legs = direction === 'in' ? [true] : direction === 'both' ? [false, true] : [false];
  const limit = Math.min(limits.max_edges_per_hop, edgeCapacity);
  const requests: Array<{ inbound: boolean; relation?: string; query: HopQuery }> =
    edgesIndex !== undefined
      ? legs.map((inbound) => ({
          inbound,
          query: buildEdgeHopQuery({
            hop,
            edgesIndex,
            lookupIndex,
            frontier,
            limit,
            lookback,
            exclusions,
            visited: input.visited,
            hubDegree: limits.hub_degree,
            inbound,
          }),
        }))
      : legs.flatMap((inbound) =>
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
    const took = typeof result.took === 'number' ? result.took : 0;
    stats.es_took_ms += took;
    stats.es_took_per_query.push(took);
    stats.queries += 1;
    stats.rows_returned += result.values.length;
    if (result.values.length >= limit) truncated = true;
    collected.push(...parseRows({ result, hop, relation, frontier: frontierSet, inbound }));
  });
  stats.relationships_read = relationshipsRead(collected);

  // 4. Excluded nodes (the query already left out excluded documents and pointer values;
  //    this covers whichever end the query could not filter)
  const kept = collected.filter(
    ({ edge }) => !excludedIds.has(edge.source) && !excludedIds.has(edge.target)
  );
  stats.excluded_edges = collected.length - kept.length;
  // The rows are ordered by the node they reach, as the GRAPH EXPAND driver orders a hop's
  // rows before its hub refusal and caps: a STATS result has no order of its own, so without
  // this the rows a cap kept varied between runs and between the array and edge-document
  // queries, and the two storages walked on from different nodes.
  kept.sort((a, b) => (a.reached < b.reached ? -1 : a.reached > b.reached ? 1 : 0));

  // 5. Hub exclusion
  const hubs = findHubs(kept, limits.hub_degree);
  if (hubs.size > 0) {
    truncated = true;
    stats.hubs_skipped = Array.from(hubs);
  }

  // 6. Dedupe. Edges onto visited nodes are filtered inside the hop query; any that still
  //    arrive are counted below as closing edges. In a `both` walk such an edge was recorded
  //    from the other node's side when it was expanded, so it is dropped as a repeat.
  const deduped = dedupeEdges(kept, hubs).filter(
    ({ reached }) => direction !== 'both' || !visitedSet.has(reached)
  );

  // 7. New-node caps, in the driver's order: `max_frontier` bounds the new nodes this hop
  //    admits (they are the next frontier), then `max_nodes` bounds what the walk may still
  //    admit. Closing edges and further edges onto an admitted new node keep their rows.
  const capped = capNewNodes(deduped, visitedSet, limits.max_frontier, nodeCapacity);
  stats.dropped_frontier = capped.droppedByFrontier;
  if (capped.droppedByFrontier > 0) truncated = true;
  const nodeCapHit = capped.droppedByNodes > 0;

  // 8. Edge budget: the rows the run may still hold, in the same order.
  const admittedEdges = capped.rows.slice(0, edgeCapacity);
  stats.dropped_edges = capped.rows.length - admittedEdges.length;
  stats.edges_added = admittedEdges.length;
  if (stats.dropped_edges > 0) {
    truncated = true;
    stopReason = 'max_edges_total';
  }

  // 9. Admission: a node is new on its first admitted edge.
  const nodes: TraversalNode[] = [];
  const admitted = new Set<string>();
  for (const collectedEdge of admittedEdges) {
    const { edge, reached, inbound } = collectedEdge;
    if (visitedSet.has(reached)) {
      stats.closing_edges += 1;
    } else if (!admitted.has(reached)) {
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
  for (const node of nodes) visitedSet.add(node.id);
  stats.new_nodes = nodes.length;
  // 10. Stop conditions: the hop that admits a matching node is the last one. The whole hop is
  //     kept (hops are unordered), so the result holds the match and its context.
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
