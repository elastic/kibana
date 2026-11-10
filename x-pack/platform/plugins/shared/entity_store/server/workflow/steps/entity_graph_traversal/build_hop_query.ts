/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TraversalExclusion,
  TraversalHop,
} from '../../../../common/workflow/steps/entity_graph_traversal/entity_graph_traversal_common';

export const HOP_SOURCE_COLUMN = '__source';
export const HOP_TARGET_COLUMN = '__target';
export const HOP_COUNT_COLUMN = '__count';
export const hopPayloadColumn = (index: number): string => `__payload_${index}`;

/** The entity store's id field, which the latest index is joined on. */
export const HOP_ENTITY_ID_FIELD = 'entity.id';

/**
 * Unmapped fields are loaded from `_source` instead of failing the query: a relationship key
 * a scenario names may not be mapped yet in an older entity index.
 */
export const HOP_QUERY_PREAMBLE = 'SET unmapped_fields="load";';

/** A run's `lookback` only expands entities seen within the window. */
export const HOP_LOOKBACK_FIELD = 'entity.lifecycle.last_seen';

const quoteField = (field: string): string => `\`${field}\``;

/**
 * `24h` -> `24 hours`, the time-span literal ES|QL accepts in `NOW() - <span>`.
 */
export const lookbackToEsqlSpan = (lookback: string): string => {
  const match = lookback.match(/^([0-9]{1,5})(m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid lookback "${lookback}"; expected <number>(m|h|d)`);
  }
  const unit = { m: 'minutes', h: 'hours', d: 'days' }[match[2] as 'm' | 'h' | 'd'];
  return `${match[1]} ${unit}`;
};

export interface HopQuery {
  query: string;
  params: string[];
}

export interface BuildHopQueryParams {
  hop: TraversalHop;
  /** The entity store's latest index pattern for the execution space. */
  index: string;
  /**
   * The concrete latest entity index (lookup mode) of the execution space. When given, an
   * outbound query joins each reached id to its entity document so the payload fields
   * describe the reached node; without it, they are read off the frontier document.
   */
  lookupIndex?: string;
  /** One of the hop's target fields, an `entity.relationships.<key>.ids` array. */
  targetField: string;
  frontier: string[];
  limit: number;
  lookback?: string;
  exclusions?: TraversalExclusion[];
  /**
   * Walk the edges backwards: read the entities whose target field points at a frontier id,
   * instead of the frontier entities' own target field. Rows keep the stored orientation
   * (`__source` is the entity holding the field, `__target` the id it points at), so on an
   * inbound query `__target` is the frontier id and `__source` the entity reached.
   */
  inbound?: boolean;
}

/**
 * Build the ES|QL query that expands `frontier` across one relationship field of a hop,
 * over the entity store's latest index. The frontier is bound as positional parameters so
 * ids are never interpolated into the query text. Field names come from the scenario and are
 * validated against a conservative pattern before they get here; the scenario filter is
 * trusted (it ships inside Kibana) but is wrapped in parentheses and rejected if it contains
 * a pipe, so it can only ever narrow the hop's `WHERE`.
 *
 * Outbound, the frontier is matched on `entity.id` (pushed down to Lucene), the target field
 * is exploded into one row per pointed id, and, given a lookup index, each pointed id is
 * joined to its entity document. Inbound, the target field is exploded first and then matched
 * against the frontier, so a multi-valued pointer still finds the entity; the document read
 * is the node reached, so no join is needed.
 *
 * The payload columns describe the node the edge reaches, never the frontier entity, so
 * stop conditions on payload fields test the node being admitted. Only the walk columns and
 * the payload come back: the node's entity document is read once, after the traversal, by
 * the resolve step, so the rows a hop holds stay small.
 */
export const buildHopQuery = ({
  hop,
  index,
  lookupIndex,
  targetField,
  frontier,
  limit,
  lookback,
  exclusions = [],
  inbound = false,
}: BuildHopQueryParams): HopQuery => {
  if (frontier.length === 0) {
    throw new Error('Cannot build a hop query for an empty frontier');
  }
  const match = quoteField(hop.match_field);
  const target = quoteField(targetField);
  const payloadStats = hop.payload_fields.map(
    (field, position) => `${hopPayloadColumn(position)} = VALUES(${quoteField(field)})`
  );

  // Parameters are positional, so every value is registered in the order its `?` appears.
  const params: string[] = [];
  const placeholders = (values: string[]): string => {
    params.push(...values);
    return values.map(() => '?').join(', ');
  };
  // An exclusion on the pointer field is applied after MV_EXPAND so only the excluded value
  // is dropped, not every entity that lists it among others. One on the match field
  // (entity.id) drops the entity's own document. Any other field filters whole documents.
  const targetExclusions = exclusions.filter((e) => e.field === targetField);
  const matchExclusions = exclusions.filter((e) => e.field === hop.match_field);
  const documentExclusions = exclusions.filter(
    (e) => e.field !== targetField && e.field !== hop.match_field
  );

  const lines = [HOP_QUERY_PREAMBLE, `FROM ${index}`];
  if (inbound) {
    lines.push(`| WHERE ${target} IS NOT NULL AND ${match} IS NOT NULL`);
  } else {
    lines.push(`| WHERE ${match} IN (${placeholders(frontier)}) AND ${target} IS NOT NULL`);
  }
  if (hop.filter) {
    lines.push(`| WHERE (${hop.filter})`);
  }
  if (lookback) {
    lines.push(
      `| WHERE ${quoteField(HOP_LOOKBACK_FIELD)} >= NOW() - ${lookbackToEsqlSpan(lookback)}`
    );
  }
  for (const { values } of matchExclusions) {
    lines.push(`| WHERE NOT ${match} IN (${placeholders(values)})`);
  }
  for (const { field, values } of documentExclusions) {
    const quoted = quoteField(field);
    const contains = values.map(() => `MV_CONTAINS(${quoted}, ?)`).join(' OR ');
    placeholders(values);
    lines.push(`| WHERE ${quoted} IS NULL OR NOT (${contains})`);
  }
  lines.push(`| MV_EXPAND ${target}`);
  if (inbound) {
    lines.push(`| WHERE ${target} IN (${placeholders(frontier)})`);
  }
  for (const { values } of targetExclusions) {
    lines.push(`| WHERE NOT ${target} IN (${placeholders(values)})`);
  }

  const stats = `| STATS ${[`${HOP_COUNT_COLUMN} = COUNT(*)`, ...payloadStats].join(', ')}`;
  if (!inbound && lookupIndex !== undefined) {
    // Keep the frontier id aside, make the pointed id the join key, and drop the frontier
    // document's own columns so the joined ones are unambiguously the reached entity's.
    const entityId = quoteField(HOP_ENTITY_ID_FIELD);
    lines.push(
      `| EVAL ${HOP_SOURCE_COLUMN} = ${match}`,
      `| RENAME ${target} AS ${entityId}`,
      `| KEEP ${HOP_SOURCE_COLUMN}, ${entityId}`,
      `| LOOKUP JOIN ${lookupIndex} ON ${entityId}`,
      `${stats} BY ${HOP_SOURCE_COLUMN}, ${HOP_TARGET_COLUMN} = ${entityId}`
    );
  } else {
    lines.push(`${stats} BY ${HOP_SOURCE_COLUMN} = ${match}, ${HOP_TARGET_COLUMN} = ${target}`);
  }
  lines.push(`| LIMIT ${limit}`);

  return { query: lines.join('\n'), params };
};
