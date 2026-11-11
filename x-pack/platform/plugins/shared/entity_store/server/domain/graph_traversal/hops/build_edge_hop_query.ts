/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TraversalExclusion,
  TraversalHop,
} from '../../../../common/graph_traversal/hop_types';
import { TRAVERSAL_NODE_ID_FIELD } from '../../../../common/graph_traversal/hop_types';
import {
  HOP_COUNT_COLUMN,
  HOP_ENTITY_ID_FIELD,
  HOP_QUERY_PREAMBLE,
  HOP_REACHED_COLUMN,
  HOP_READ_COLUMN,
  HOP_SOURCE_COLUMN,
  HOP_TARGET_COLUMN,
  hopPayloadColumn,
  lookbackToEsqlSpan,
  type HopQuery,
  type HopQueryParam,
} from './build_hop_query';

/** The edge document's fields: the node holding the relationship, its kind, the node it reaches. */
export const EDGE_SOURCE_FIELD = 'src';
export const EDGE_KIND_FIELD = 'kind';
export const EDGE_TARGET_FIELD = 'dst';
/** When the edge was last observed; the lookback applies to it. */
export const EDGE_LAST_SEEN_FIELD = 'last_seen';
/** The relationship kind of a row, read off the edge document. */
export const HOP_RELATION_COLUMN = '__relation';

export interface BuildEdgeHopQueryParams {
  hop: TraversalHop;
  /** The space's edges index or alias. */
  edgesIndex: string;
  /**
   * The concrete latest entity index, joined so the payload fields describe the node reached
   * and so the hop filter and document exclusions can test it. Without it the rows carry ids
   * and kinds only.
   */
  lookupIndex?: string;
  frontier: string[];
  limit: number;
  lookback?: string;
  exclusions?: TraversalExclusion[];
  /** Ids already admitted; edges onto them are left out inside the query. */
  visited?: string[];
  /** Keep at most `hubDegree + 1` reached ids per frontier node and kind. */
  hubDegree?: number;
  /** Walk the edges backwards: match the frontier on `dst` and reach `src`. */
  inbound?: boolean;
}

const quoteField = (field: string): string => `\`${field}\``;

/**
 * Build the ES|QL query that expands `frontier` over edge documents for one hop: every kind
 * the hop follows in one query, since a kind is a value rather than a field. Rows keep the
 * stored orientation (`__source` holds the relationship, `__target` is reached by it) and
 * carry the kind in `__relation`, so the rows of an outbound and an inbound leg read alike.
 *
 * Both ends of an edge are single values, so the frontier, the visited ids and the node
 * exclusions are plain IN filters Lucene answers. With `hubDegree` the rows are grouped per
 * frontier node and kind and at most `hubDegree + 1` reached ids are kept with TOP, enough
 * for the hub check after the fetch to refuse the node without reading every edge of a hub.
 * The reached ids are then joined to their entity documents for the payload, the hop filter
 * and the document exclusions, all of which describe nodes rather than edges.
 */
export const buildEdgeHopQuery = ({
  hop,
  edgesIndex,
  lookupIndex,
  frontier,
  limit,
  lookback,
  exclusions = [],
  visited = [],
  hubDegree,
  inbound = false,
}: BuildEdgeHopQueryParams): HopQuery => {
  if (frontier.length === 0) {
    throw new Error('Cannot build a hop query for an empty frontier');
  }
  const kinds = hop.target_fields.map(({ relation }) => relation);
  const documentExclusions = exclusions.filter((e) => e.field !== TRAVERSAL_NODE_ID_FIELD);
  if (lookupIndex === undefined && (hop.filter !== undefined || documentExclusions.length > 0)) {
    throw new Error(
      `Hop "${hop.name}" filters entity documents, which the edge-document walk can only do with a lookup index`
    );
  }
  const nodeExclusions = exclusions
    .filter((e) => e.field === TRAVERSAL_NODE_ID_FIELD)
    .flatMap((e) => e.values);
  const payloadStats = hop.payload_fields.map(
    (field, position) => `${hopPayloadColumn(position)} = VALUES(${quoteField(field)})`
  );

  const params: HopQueryParam[] = [];
  const placeholders = (values: string[]): string => {
    params.push(...values);
    return values.map(() => '?').join(', ');
  };

  const frontierField = inbound ? EDGE_TARGET_FIELD : EDGE_SOURCE_FIELD;
  const reachedField = inbound ? EDGE_SOURCE_FIELD : EDGE_TARGET_FIELD;
  const frontierColumn = inbound ? HOP_TARGET_COLUMN : HOP_SOURCE_COLUMN;
  const reachedColumn = inbound ? HOP_SOURCE_COLUMN : HOP_TARGET_COLUMN;
  const entityId = quoteField(HOP_ENTITY_ID_FIELD);
  const join =
    lookupIndex !== undefined &&
    (payloadStats.length > 0 || hop.filter !== undefined || documentExclusions.length > 0);

  const lines = [
    HOP_QUERY_PREAMBLE,
    `FROM ${edgesIndex}`,
    `| WHERE ${frontierField} IN (${placeholders(
      frontier
    )}) AND ${EDGE_KIND_FIELD} IN (${placeholders(kinds)})`,
  ];
  if (visited.length > 0) {
    lines.push(`| WHERE NOT ${reachedField} IN (${placeholders(visited)})`);
  }
  if (nodeExclusions.length > 0) {
    lines.push(`| WHERE NOT ${reachedField} IN (${placeholders(nodeExclusions)})`);
  }
  if (lookback) {
    lines.push(`| WHERE ${EDGE_LAST_SEEN_FIELD} >= NOW() - ${lookbackToEsqlSpan(lookback)}`);
  }

  // The reached id ends up in `entity.id` when it is joined, else in a column of its own.
  const reachedKey = join ? entityId : HOP_REACHED_COLUMN;
  if (hubDegree !== undefined) {
    lines.push(
      `| STATS ${HOP_REACHED_COLUMN} = TOP(${reachedField}, ${
        hubDegree + 1
      }, "asc"), ${HOP_READ_COLUMN} = COUNT(*) BY ${frontierColumn} = ${frontierField}, ${HOP_RELATION_COLUMN} = ${EDGE_KIND_FIELD}`,
      `| MV_EXPAND ${HOP_REACHED_COLUMN}`
    );
    if (join) {
      lines.push(`| RENAME ${HOP_REACHED_COLUMN} AS ${entityId}`);
    }
  } else {
    // The edge's own columns (`source`, `labels`, ...) must not travel into the join.
    lines.push(
      `| RENAME ${frontierField} AS ${frontierColumn}, ${EDGE_KIND_FIELD} AS ${HOP_RELATION_COLUMN}, ${reachedField} AS ${reachedKey}`,
      `| KEEP ${frontierColumn}, ${HOP_RELATION_COLUMN}, ${reachedKey}`
    );
  }
  if (join) {
    lines.push(`| LOOKUP JOIN ${lookupIndex} ON ${entityId}`);
    if (hop.filter) {
      lines.push(`| WHERE (${hop.filter})`);
    }
    for (const { field, values } of documentExclusions) {
      const quoted = quoteField(field);
      const contains = values.map(() => `MV_CONTAINS(${quoted}, ?)`).join(' OR ');
      placeholders(values);
      lines.push(`| WHERE ${quoted} IS NULL OR NOT (${contains})`);
    }
  }
  const stats = [
    `${HOP_COUNT_COLUMN} = COUNT(*)`,
    ...(hubDegree !== undefined ? [`${HOP_READ_COLUMN} = MAX(${HOP_READ_COLUMN})`] : []),
    ...(join ? payloadStats : []),
  ].join(', ');
  lines.push(
    `| STATS ${stats} BY ${frontierColumn}, ${HOP_RELATION_COLUMN}, ${reachedColumn} = ${reachedKey}`,
    `| LIMIT ${limit}`
  );
  return { query: lines.join('\n'), params };
};
