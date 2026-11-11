/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityGraphTraversalPlan } from '../../../../common/graph_traversal/scenarios';
import type {
  GraphTraversalEdge,
  GraphTraversalEntity,
  GraphTraversalNode,
  GraphTraversalOutput,
} from '../../../../common/graph_traversal';
import { traceGraphTraversalRoutes } from '../../../../common/graph_traversal';
import {
  ENTITY_COLUMNS,
  GRAPH_EXPAND_COUNT_COLUMN,
  graphExpandPayloadColumn,
  relationForField,
  type GraphExpandStatement,
} from './build_graph_expand';

export interface EsqlResult {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
  /** Milliseconds Elasticsearch reports it spent on the query, when the response carries it. */
  took?: number;
}

const NODE_FROM = 'node_from';
const NODE_TO = 'node_to';
const HOP = 'hop';
const RELATION = 'relation';
const DROPPED = 'dropped';
const ENGINE_TYPES = ['user', 'host', 'service', 'generic'] as const;

const toId = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

const toCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 1;

const firstString = (value: unknown): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && first.length > 0 ? first : undefined;
};

const allStrings = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );

type ColumnReader = (name: string) => unknown;

/**
 * The entity document fields of one row, as the walk's `LOOKUP JOIN` or an entity lookup
 * query returns them. Undefined when the row carries no entity (an id the store lacks).
 */
export const readEntity = (
  read: ColumnReader
): { entity: GraphTraversalEntity; resolvedTo?: string } | undefined => {
  const engineType = firstString(read(ENTITY_COLUMNS.engineType));
  const riskScore = read(ENTITY_COLUMNS.riskScore);
  const sources = allStrings(read(ENTITY_COLUMNS.source));
  const optional = (key: keyof GraphTraversalEntity, value: string | undefined) =>
    value !== undefined ? { [key]: value } : {};
  const entity: GraphTraversalEntity = {
    ...optional('name', firstString(read(ENTITY_COLUMNS.name))),
    ...optional('type', firstString(read(ENTITY_COLUMNS.type))),
    ...optional('sub_type', firstString(read(ENTITY_COLUMNS.subType))),
    ...((ENGINE_TYPES as readonly string[]).includes(engineType ?? '') && {
      engine_type: engineType as GraphTraversalEntity['engine_type'],
    }),
    ...(sources.length > 0 && { sources }),
    ...optional('criticality', firstString(read(ENTITY_COLUMNS.criticality))),
    ...optional('risk_level', firstString(read(ENTITY_COLUMNS.riskLevel))),
    ...(typeof riskScore === 'number' && Number.isFinite(riskScore) && { risk_score: riskScore }),
  };
  // A joined row with no entity fields at all is an id the store does not hold.
  if (Object.keys(entity).length === 0) return undefined;
  const resolvedTo = firstString(read(ENTITY_COLUMNS.resolvedTo));
  return { entity, ...(resolvedTo !== undefined && { resolvedTo }) };
};

export interface MappedGraphExpandResult {
  output: Omit<GraphTraversalOutput, 'scenario_id' | 'scenario_name' | 'seed_id' | 'limits'>;
  /** Frontier nodes `hub_degree` refused, with the degree each had. */
  hubs: Array<{ id: string; degree: number }>;
}

/**
 * Turn the rows of a `GRAPH EXPAND` statement into the traversal's nodes and edges. Rows keep
 * the stored orientation (`node_from` is the entity holding the relationship); the reached
 * column names the node a row admitted, or is null for an edge that closes onto a node
 * already reached. When the statement joined the entity index, each admitted node carries
 * its entity document and is marked resolved. A hub stub (`node_to` null, `dropped` set)
 * marks the run truncated. Edges that touch an excluded node id are dropped and repeated
 * (relation, source, target) triples collapse to the first, as the workflow's hop step does.
 */
export const mapGraphExpandResult = (
  result: EsqlResult,
  statement: GraphExpandStatement,
  plan: EntityGraphTraversalPlan,
  seed: GraphTraversalNode
): MappedGraphExpandResult => {
  const column = (name: string): number => result.columns.findIndex((c) => c.name === name);
  const idx = {
    from: column(NODE_FROM),
    to: column(NODE_TO),
    reached: column(statement.reachedColumn),
    hop: column(HOP),
    relation: column(RELATION),
    dropped: column(DROPPED),
    count: column(GRAPH_EXPAND_COUNT_COLUMN),
  };
  if (idx.from < 0 || idx.to < 0 || idx.reached < 0 || idx.hop < 0) {
    throw new Error(
      `GRAPH EXPAND result lacks the ${NODE_FROM}/${NODE_TO}/${statement.reachedColumn}/${HOP} columns`
    );
  }
  const payloadColumns = statement.payloadFields
    .map((field, index) => ({ field, idx: column(graphExpandPayloadColumn(index)) }))
    .filter(({ idx: i }) => i >= 0);
  const excluded = new Set(statement.excludedIds);
  const cell = (row: unknown[], index: number): unknown => (index >= 0 ? row[index] : undefined);
  // A `both` walk reports an edge again as a closing edge on the hop that reaches it from the
  // other side; one (relation, source, target) triple is kept, on the hop it was first seen.
  const seenEdges = new Set<string>();

  const nodes: GraphTraversalNode[] = [seed];
  const admitted = new Set<string>([seed.id]);
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
    const relation = relationForField(statement, toId(cell(row, idx.relation))) ?? 'related_to';
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
      const hopSpec = plan.hops[Math.min(Math.max(hop, 1), plan.hops.length) - 1];
      // Reached on the pointed side, the node is the hop's target type; reached as the holder
      // of the relationship (inbound leg of a `both` walk), it is the source type.
      const type = reached === to ? hopSpec?.target_type : hopSpec?.source_type;
      const stored = statement.enriched ? readEntity((name) => cell(row, column(name))) : undefined;
      nodes.push({
        id: reached,
        hop,
        via: relation,
        ...(type !== undefined && { type }),
        ...(statement.enriched && {
          euid: reached,
          resolved: stored !== undefined,
          ...(stored?.resolvedTo !== undefined && { canonical_euid: stored.resolvedTo }),
          ...(stored && { entity: stored.entity }),
        }),
      });
    }
  }

  // A result that fills the statement's LIMIT was cut by it: the walk may have gone further.
  const rowsCut = result.values.length >= statement.rowLimit;
  const truncated = hubs.length > 0 || rowsCut;
  // UNTIL ends the walk on the hop that admits a matching node; the mapper reads that off the
  // admitted nodes rather than trusting the hop count.
  const wanted = new Set(statement.untilIds);
  const untilMatches = nodes.filter((n) => n.hop > 0 && wanted.has(n.id)).map((n) => n.id);
  const stopReason =
    untilMatches.length > 0
      ? 'until_matched'
      : rowsCut
      ? 'max_edges_total'
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
        routes: traceGraphTraversalRoutes(seed.id, edges, untilMatches),
      }),
    },
    hubs,
  };
};
