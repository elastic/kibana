/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityGraphTraversalPlan } from '@kbn/workflows/managed';
import type {
  GraphTraversalEdge,
  GraphTraversalNode,
  GraphTraversalOutput,
} from '../../../../common/graph_traversal';
import { traceGraphTraversalRoutes } from '../../../../common/graph_traversal';
import {
  GRAPH_EXPAND_COUNT_COLUMN,
  graphExpandPayloadColumn,
  relationForColumn,
  type GraphExpandStatement,
} from './build_graph_expand';

export interface EsqlResult {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

const NODE_FROM = 'node_from';
const NODE_TO = 'node_to';
const NODE_REACHED = 'node_reached';
const HOP = 'hop';
const RELATION = 'relation';
const DROPPED = 'dropped';

const toId = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

const toCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 1;

export interface MappedGraphExpandResult {
  output: Omit<GraphTraversalOutput, 'scenario_id' | 'scenario_name' | 'seed_id' | 'limits'>;
  /** Frontier nodes `hub_degree` refused, with the degree each had. */
  hubs: Array<{ id: string; degree: number }>;
}

/**
 * Turn the rows of a `GRAPH EXPAND` statement into the traversal's nodes and edges. Rows keep
 * the stored orientation (`node_from` is the id side of the projection); `node_reached` names
 * the node a row admitted, or is null for an edge that closes onto a node already reached.
 * A hub stub (`node_to` null, `dropped` set) marks the run truncated. Edges that touch an
 * excluded node id are dropped and repeated (relation, source, target) triples collapse to
 * the first, as the workflow's hop step does.
 */
export const mapGraphExpandResult = (
  result: EsqlResult,
  statement: GraphExpandStatement,
  plan: EntityGraphTraversalPlan,
  seedId: string
): MappedGraphExpandResult => {
  const column = (name: string): number => result.columns.findIndex((c) => c.name === name);
  const idx = {
    from: column(NODE_FROM),
    to: column(NODE_TO),
    reached: column(NODE_REACHED),
    hop: column(HOP),
    relation: column(RELATION),
    dropped: column(DROPPED),
    count: column(GRAPH_EXPAND_COUNT_COLUMN),
  };
  if (idx.from < 0 || idx.to < 0 || idx.reached < 0 || idx.hop < 0) {
    throw new Error('GRAPH EXPAND result lacks the node_from/node_to/node_reached/hop columns');
  }
  const payloadColumns = statement.payloadFields
    .map((field, index) => ({ field, idx: column(graphExpandPayloadColumn(index)) }))
    .filter(({ idx: i }) => i >= 0);
  const excluded = new Set(statement.excludedIds);
  const cell = (row: unknown[], index: number): unknown => (index >= 0 ? row[index] : undefined);
  // A `both` walk reports an edge again as a closing edge on the hop that reaches it from the
  // other side; one (relation, source, target) triple is kept, on the hop it was first seen.
  const seenEdges = new Set<string>();

  const nodes: GraphTraversalNode[] = [{ id: seedId, hop: 0, via: 'seed', type: plan.seed.type }];
  const admitted = new Set<string>([seedId]);
  const edges: GraphTraversalEdge[] = [];
  const hubs: MappedGraphExpandResult['hubs'] = [];
  let hopsExecuted = 0;

  for (const row of result.values) {
    const from = toId(cell(row, idx.from));
    const to = toId(cell(row, idx.to));
    const reached = toId(cell(row, idx.reached));
    const hopValue = cell(row, idx.hop);
    const hop = typeof hopValue === 'number' ? hopValue : 0;
    const dropped = cell(row, idx.dropped);
    hopsExecuted = Math.max(hopsExecuted, hop);

    if (from !== undefined && to === undefined && typeof dropped === 'number') {
      hubs.push({ id: from, degree: dropped });
      continue;
    }
    if (from === undefined || to === undefined) continue;
    const relation = relationForColumn(statement, toId(cell(row, idx.relation))) ?? 'related_to';
    if (excluded.has(from) || excluded.has(to)) continue;
    const edgeKey = `${relation}\u0000${from}\u0000${to}`;
    if (seenEdges.has(edgeKey)) continue;
    seenEdges.add(edgeKey);

    const payloadEntries = payloadColumns
      .map(({ field, idx: i }) => [field, row[i]] as const)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([field, value]) => [field, Array.isArray(value) ? value : [value]] as const);
    edges.push({
      hop,
      relation,
      source: from,
      target: to,
      count: toCount(cell(row, idx.count)),
      ...(payloadEntries.length > 0 && { payload: Object.fromEntries(payloadEntries) }),
    });

    if (reached !== undefined && !admitted.has(reached)) {
      admitted.add(reached);
      const types = statement.relationTypes[relation] ?? {};
      // A node reached on the `to` side is the relation's target type; on the `from` side
      // (inbound leg of a `both` walk) it is the source type.
      const type = reached === to ? types.target_type : types.source_type;
      nodes.push({ id: reached, hop, via: relation, ...(type !== undefined && { type }) });
    }
  }

  const truncated = hubs.length > 0;
  // UNTIL ends the walk on the hop that admits a matching node; the mapper reads that off the
  // admitted nodes rather than trusting the hop count.
  const wanted = new Set(statement.untilIds);
  const untilMatches = nodes.filter((n) => n.hop > 0 && wanted.has(n.id)).map((n) => n.id);
  const stopReason =
    untilMatches.length > 0
      ? 'until_matched'
      : hopsExecuted >= statement.maxHops
      ? 'max_hops'
      : 'frontier_exhausted';
  return {
    output: {
      hops_planned: statement.maxHops,
      hops_executed: hopsExecuted,
      stop_reason: stopReason,
      truncated,
      node_count: nodes.length,
      edge_count: edges.length,
      nodes,
      edges,
      ...(statement.untilIds.length > 0 && {
        until_matches: untilMatches,
        routes: traceGraphTraversalRoutes(seedId, edges, untilMatches),
      }),
    },
    hubs,
  };
};
