/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityGraphTraversalPlan } from '../../../../common/graph_traversal/scenarios';
import { entityGraphTraversalRelationshipKey } from '../../../../common/graph_traversal/scenarios';
import type {
  GraphTraversalExclusion,
  GraphTraversalStopCondition,
} from '../../../../common/graph_traversal';
import { GraphTraversalError } from '../graph_traversal_error';

/** Node ids are entity ids; an exclusion or stop condition on this field names nodes. */
export const NODE_ID_EXCLUSION_FIELD = 'entity.id';

/**
 * Unmapped fields are loaded from `_source` instead of failing the statement: a relationship
 * key a scenario names may not be mapped yet in an older entity index.
 */
export const GRAPH_EXPAND_PREAMBLE = 'SET unmapped_fields="load";';

export const GRAPH_EXPAND_COUNT_COLUMN = '__count';
export const graphExpandPayloadColumn = (index: number): string => `__payload_${index}`;

/** A run's `lookback` only expands entities seen within the window. */
export const GRAPH_EXPAND_LOOKBACK_FIELD = 'entity.lifecycle.last_seen';
/** Edge document fields and the lookback field on them. */
export const EDGE_SOURCE_FIELD = 'src';
export const EDGE_KIND_FIELD = 'kind';
export const EDGE_TARGET_FIELD = 'dst';
export const EDGE_LAST_SEEN_FIELD = 'last_seen';

/** The walk's reached-node column, and its name once `LOOKUP JOIN` has keyed on it. */
export const NODE_REACHED_COLUMN = 'node_reached';

/** Columns `LOOKUP JOIN` adds from the entity document of each reached node. */
export const ENTITY_COLUMNS = {
  name: 'entity.name',
  type: 'entity.type',
  subType: 'entity.sub_type',
  engineType: 'entity.EngineMetadata.Type',
  source: 'entity.source',
  criticality: 'asset.criticality',
  riskLevel: 'entity.risk.calculated_level',
  riskScore: 'entity.risk.calculated_score_norm',
  resolvedTo: 'entity.relationships.resolution.resolved_to',
} as const;

const quoteField = (field: string): string => `\`${field}\``;

/** `24h` -> `24 hours`, the time-span literal ES|QL accepts in `NOW() - <span>`. */
const lookbackToEsqlSpan = (lookback: string): string => {
  const match = lookback.match(/^([0-9]{1,5})(m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid lookback "${lookback}"; expected <number>(m|h|d)`);
  }
  const unit = { m: 'minutes', h: 'hours', d: 'days' }[match[2] as 'm' | 'h' | 'd'];
  return `${match[1]} ${unit}`;
};

export interface GraphExpandStatement {
  query: string;
  params: string[];
  direction: 'out' | 'in' | 'both';
  /** The `TO` fields in the order written, each with the relation label it carries. */
  targets: Array<{ field: string; relation: string }>;
  /** Payload fields, in `__payload_<n>` order. */
  payloadFields: string[];
  /** Node ids the run excludes; edges to or from them are dropped from the result. */
  excludedIds: string[];
  /** Node ids the walk stops at (the scenario's and the run's stop conditions). */
  untilIds: string[];
  maxHops: number;
  /**
   * Rows the statement returns at most: the walk's `max_edges_total`. Without an explicit
   * `LIMIT` Elasticsearch cuts the result at its own default (1,000 rows) and says nothing,
   * so a result that fills this limit was cut and the run is reported truncated.
   */
  rowLimit: number;
  /** The column holding the reached node id: `entity.id` once joined, else `node_reached`. */
  reachedColumn: string;
  /** Whether the rows carry the reached node's entity document (`LOOKUP JOIN`). */
  enriched: boolean;
  /** Whether the walk read edge documents; `relation` then holds the kind itself. */
  edgeDocuments: boolean;
}

export interface BuildGraphExpandParams {
  plan: EntityGraphTraversalPlan;
  /** The entity store's latest index pattern for the space; nodes and edges both live there. */
  indexPattern: string;
  /**
   * The concrete latest index (a lookup-mode index) to `LOOKUP JOIN` each reached node's
   * document from. Without it the rows carry ids only and nodes come back unresolved.
   */
  lookupIndex?: string;
  /**
   * The space's edges index or alias. When set the walk reads edge documents (`src`, `kind`,
   * `dst`) instead of the relationship arrays on the entity documents: one TO field carries
   * every relationship, `relation_field` names the kind and `hop_relations` the kinds per hop.
   */
  edgesIndex?: string;
  seedId: string;
  lookback?: string;
  exclusions?: GraphTraversalExclusion[];
  /** Added to the plan's own stop conditions. */
  until?: GraphTraversalStopCondition[];
}

/**
 * Translate a traversal plan into one `GRAPH EXPAND` statement over the entity store's
 * latest index: the frontier is matched on `entity.id` and every relationship key any hop
 * follows is a `TO` field, so the walk follows the union of the scenario's relationships on
 * every hop. The direction, limits, exclusions and stop conditions map onto the command's
 * own options. With a lookup index, a trailing `LOOKUP JOIN` attaches each reached node's
 * entity document, which replaces a separate resolve query. The seed and every exclusion or
 * stop value are bound as parameters.
 *
 * One hop filter is honoured when every hop declares the same one, since the command has a
 * single document predicate; differing per-hop filters are refused rather than approximated.
 */
export const buildGraphExpandStatement = ({
  plan,
  indexPattern,
  lookupIndex,
  edgesIndex,
  seedId,
  lookback,
  exclusions = [],
  until = [],
}: BuildGraphExpandParams): GraphExpandStatement => {
  if (plan.hops.length === 0) {
    throw new GraphTraversalError(`Scenario "${plan.id}" has no hops`, 400);
  }
  const edgeDocuments = edgesIndex !== undefined;
  // Parameters are positional: the seed comes first in the statement, then the document
  // exclusion values in the WHERE, then the UNTIL ids.
  const params: string[] = [];
  const placeholders = (values: string[]): string => {
    params.push(...values);
    return values.map(() => '?').join(', ');
  };
  const seedPlaceholder = placeholders([seedId]);

  // The union of relationship fields across hops, in first-seen order. Over edge documents
  // the kinds play that part: `relation` carries a kind value, which maps to itself.
  const targets: GraphExpandStatement['targets'] = [];
  for (const hop of plan.hops) {
    for (const { field, relation } of hop.target_fields) {
      const key = edgeDocuments ? relation : field;
      if (!targets.some((t) => t.field === key)) targets.push({ field: key, relation });
    }
  }

  const filters = new Set(plan.hops.map((hop) => hop.filter ?? ''));
  if (filters.size > 1) {
    throw new GraphTraversalError(
      `The ES|QL traversal needs one filter for every hop of scenario "${plan.id}"; its hops declare different filters`,
      400
    );
  }
  const [filter] = filters;

  const excludedIds = exclusions
    .filter((e) => e.field === NODE_ID_EXCLUSION_FIELD)
    .flatMap((e) => e.values);
  const documentExclusions = exclusions.filter((e) => e.field !== NODE_ID_EXCLUSION_FIELD);
  // The command's WHERE tests the documents it scans. Over edge documents those are edges,
  // so a hop filter or an exclusion on an entity field has nothing to test.
  if (edgeDocuments && (filter || documentExclusions.length > 0)) {
    throw new GraphTraversalError(
      `The edge-document walk of scenario "${plan.id}" cannot filter entity documents; drop the hop filter and the exclusions on fields other than ${NODE_ID_EXCLUSION_FIELD}`,
      400
    );
  }
  const predicates: string[] = [];
  if (filter) predicates.push(`(${filter})`);
  if (lookback) {
    const lookbackField = edgeDocuments ? EDGE_LAST_SEEN_FIELD : GRAPH_EXPAND_LOOKBACK_FIELD;
    predicates.push(`${quoteField(lookbackField)} >= NOW() - ${lookbackToEsqlSpan(lookback)}`);
  }
  // Document exclusions: null-safe and multi-value safe.
  for (const { field, values } of documentExclusions) {
    const quoted = quoteField(field);
    const contains = values.map(() => `MV_CONTAINS(${quoted}, ?)`).join(' OR ');
    placeholders(values);
    predicates.push(`(${quoted} IS NULL OR NOT (${contains}))`);
  }

  // Only the edge count is aggregated. The scenario's payload fields would describe the
  // scanned document, which on an outbound leg is the frontier node rather than the node
  // reached; the reached node's document comes from the LOOKUP JOIN after the walk, and stop
  // conditions on payload fields are refused below, so aggregating them is wasted work.
  const payloadFields: string[] = [];
  const stats = [`${GRAPH_EXPAND_COUNT_COLUMN} = COUNT(*)`];

  // Stop conditions become UNTIL on the reached node. Only node ids translate: a condition on
  // a payload field would have to test a multi-valued STATS column, which IN cannot.
  const stopConditions = [...plan.until, ...until];
  const unsupported = stopConditions.find((c) => c.field !== NODE_ID_EXCLUSION_FIELD);
  if (unsupported) {
    throw new GraphTraversalError(
      `The ES|QL traversal only supports stop conditions on ${NODE_ID_EXCLUSION_FIELD}; got ${unsupported.field}`,
      400
    );
  }
  const untilIds = Array.from(new Set(stopConditions.flatMap((c) => c.values)));

  const { limits } = plan;
  // Excluded node ids are handed to the walk itself: an edge touching one is dropped before
  // it is admitted, so nothing beyond it is visited and no budget is spent on it.
  // hop_fields gives the walk the scenario's fields per hop, so a hop only issues subplans
  // for its own fields rather than for the whole TO union; max_edges_per_hop caps each
  // subplan's rows at the index. closing_edges false keeps edges back onto nodes already
  // reached out of the hop subplans, as the hop engine does, so they are never grouped or
  // shipped.
  const options = {
    max_hops: limits.max_hops,
    max_nodes: limits.max_nodes,
    max_frontier: limits.max_frontier,
    hub_degree: limits.hub_degree,
    max_edges_per_hop: limits.max_edges_per_hop,
    direction: plan.direction,
    closing_edges: false,
    ...(edgeDocuments
      ? {
          relation_field: EDGE_KIND_FIELD,
          hop_relations: plan.hops.map((hop) => hop.target_fields.map((t) => t.relation).join(',')),
        }
      : {
          hop_fields: plan.hops.map((hop) => hop.target_fields.map((t) => t.field).join(',')),
        }),
    ...(excludedIds.length > 0 && { exclude: excludedIds }),
  };

  const lines = [
    GRAPH_EXPAND_PREAMBLE,
    `ROW node_id = ${seedPlaceholder}`,
    ...(edgeDocuments
      ? [
          `| GRAPH EXPAND ${edgesIndex} ON node_id == ${EDGE_SOURCE_FIELD}`,
          `    TO ${EDGE_TARGET_FIELD}`,
        ]
      : [
          `| GRAPH EXPAND ${indexPattern} ON node_id == ${quoteField(NODE_ID_EXCLUSION_FIELD)}`,
          `    TO (${targets.map((t) => quoteField(t.field)).join(', ')})`,
        ]),
  ];
  if (predicates.length > 0) {
    lines.push(`    WHERE ${predicates.join(' AND ')}`);
  }
  lines.push(`    STATS ${stats.join(', ')}`);
  if (untilIds.length > 0) {
    lines.push(`    UNTIL ${NODE_REACHED_COLUMN} IN (${placeholders(untilIds)})`);
  }
  lines.push(`    WITH ${JSON.stringify(options)}`);
  if (lookupIndex !== undefined) {
    // The join brings every column of the reached entity's document; only the walk columns
    // and the columns the mapper reads travel back. `relation` exists only for a multi-field
    // TO and `dropped` only with hub_degree, which is always set.
    const kept = [
      'node_from',
      'node_to',
      'hop',
      ...(targets.length > 1 || edgeDocuments ? ['relation'] : []),
      'dropped',
      GRAPH_EXPAND_COUNT_COLUMN,
      quoteField(NODE_ID_EXCLUSION_FIELD),
      ...Object.values(ENTITY_COLUMNS).map(quoteField),
    ];
    lines.push(
      `| RENAME ${NODE_REACHED_COLUMN} AS ${quoteField(NODE_ID_EXCLUSION_FIELD)}`,
      `| LOOKUP JOIN ${lookupIndex} ON ${quoteField(NODE_ID_EXCLUSION_FIELD)}`,
      `| KEEP ${kept.join(', ')}`
    );
  }
  // One row per admitted edge (plus hub stubs), so the total-edge limit bounds the result.
  lines.push(`| LIMIT ${limits.max_edges_total}`);

  return {
    query: lines.join('\n'),
    params,
    direction: plan.direction,
    targets,
    payloadFields,
    excludedIds,
    untilIds,
    maxHops: limits.max_hops,
    rowLimit: limits.max_edges_total,
    reachedColumn: lookupIndex !== undefined ? NODE_ID_EXCLUSION_FIELD : NODE_REACHED_COLUMN,
    enriched: lookupIndex !== undefined,
    edgeDocuments,
  };
};

/**
 * The relation label of a `relation` result value (a `TO` field name), or of the only target
 * when the command emitted no `relation` column.
 */
export const relationForField = (
  statement: Pick<GraphExpandStatement, 'targets'>,
  field: string | undefined
): string | undefined => {
  if (field === undefined) {
    return statement.targets.length === 1 ? statement.targets[0].relation : undefined;
  }
  return (
    statement.targets.find((t) => t.field === field)?.relation ??
    entityGraphTraversalRelationshipKey(field)
  );
};

/** One entity document by id, with the columns the walk's join also carries. */
export const buildEntityLookupQuery = (
  indexPattern: string,
  entityId: string
): { query: string; params: string[] } => ({
  query: [
    GRAPH_EXPAND_PREAMBLE,
    `FROM ${indexPattern}`,
    `| WHERE ${quoteField(NODE_ID_EXCLUSION_FIELD)} == ?`,
    `| KEEP ${[NODE_ID_EXCLUSION_FIELD, ...Object.values(ENTITY_COLUMNS)].join(', ')}`,
    `| LIMIT 1`,
  ].join('\n'),
  params: [entityId],
});
