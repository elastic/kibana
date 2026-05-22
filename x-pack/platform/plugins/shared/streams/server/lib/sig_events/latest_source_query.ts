/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  esql,
  type ComposerQuery,
  type ComposerQueryTagHole,
  type ComposerSortShorthand,
} from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type CommonSearchOptions } from './query_utils';
import { runEsqlQuery } from './run_esql_query';

export type LatestSourceWhereCondition = ESQLAstExpression & ComposerQueryTagHole;

/**
 * The grouping fields used to identify the "latest revision" per logical
 * record. Accepts a single field (e.g. `discovery_id`), a 2-tuple
 * (e.g. `[stream_name, alert_id]`), or a 3-tuple
 * (e.g. `[stream.name, type, id]` for the unified KI data stream).
 */
export type LatestSourceGroupBy = string | [string, string] | [string, string, string];

/**
 * Start a `FROM <index> METADATA _id, _source | WHERE kibana.space_ids == <space>`
 * pipeline scoped to a single space.
 */
export const latestSourceFrom = (index: string, space: string): ComposerQuery =>
  esql.from([index], ['_id', '_source']).where`\`kibana.space_ids\` == ${space}`;

/**
 * Add `@timestamp >=` / `@timestamp <=` predicates only when the matching
 * option is set. No-op for absent bounds so callers can pass a partial
 * range (or none at all) without conditional plumbing.
 */
export const withTimeRange = (
  query: ComposerQuery,
  options: CommonSearchOptions
): ComposerQuery => {
  let next = query;
  if (options.from !== undefined) {
    next = next.where`@timestamp >= TO_DATETIME(${esql.str(options.from)})`;
  }
  if (options.to !== undefined) {
    next = next.where`@timestamp <= TO_DATETIME(${esql.str(options.to)})`;
  }
  return next;
};

/**
 * Append a `WHERE` predicate when one is provided; identity otherwise.
 * Used both before grouping (filter the input set) and after grouping
 * (filter the latest-per-group output, e.g. drop tombstones).
 */
export const withWhere = (
  query: ComposerQuery,
  condition?: LatestSourceWhereCondition
): ComposerQuery => {
  if (!condition) {
    return query;
  }
  return query.where`${condition}`;
};

const buildGroupByCols = (groupBy: LatestSourceGroupBy) => {
  if (typeof groupBy === 'string') {
    return [esql.col(groupBy)];
  }
  return groupBy.map((field) => esql.col(field));
};

/**
 * Two-stage `INLINE STATS` reduction that keeps the latest revision per
 * group: first by `MAX(@timestamp)`, then by `MAX(_id)` as a tiebreaker
 * when multiple events share the same timestamp.
 */
export const pickLatestPerGroup = (
  query: ComposerQuery,
  groupBy: LatestSourceGroupBy
): ComposerQuery => {
  const groupByCols = buildGroupByCols(groupBy);

  return query.pipe`INLINE STATS latest_ts = MAX(@timestamp) BY ${groupByCols}`
    .where`@timestamp == latest_ts`.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY ${groupByCols}`
    .where`_id == tiebreaker_id`;
};

/**
 * Apply a `SORT` clause when at least one sort key is provided.
 */
export const withSort = (query: ComposerQuery, sort?: ComposerSortShorthand[]): ComposerQuery => {
  if (!sort?.length) {
    return query;
  }
  return query.sort(sort[0], ...sort.slice(1));
};

/**
 * Run the composed query, locate the `_source` column in the response,
 * and decode each row by stripping the `kibana` envelope (added by
 * `IDataStreamClient` on write) so consumers see the typed payload only.
 */
export const executeAndDecodeSource = async <T>(
  esClient: ElasticsearchClient,
  query: ComposerQuery
): Promise<{ hits: T[] }> => {
  const response = await runEsqlQuery(esClient, query.print());
  if (!response) {
    return { hits: [] };
  }

  const sourceIdx = response.columns.findIndex((c) => c.name === '_source');
  if (sourceIdx === -1) {
    return { hits: [] };
  }

  return {
    hits: response.values.map((row) => {
      const source = (row[sourceIdx] ?? {}) as Record<string, unknown>;
      // `kibana.space_ids` is added by IDataStreamClient on write; strip the
      // whole `kibana` object so consumers only see the typed payload.
      const { kibana: _kibana, ...rest } = source;
      return rest as T;
    }),
  };
};
