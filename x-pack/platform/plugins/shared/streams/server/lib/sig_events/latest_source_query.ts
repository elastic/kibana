/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQueryTagHole, type ComposerSortShorthand } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { type CommonSearchOptions } from './query_utils';

export type LatestSourceWhereCondition = ESQLAstExpression & ComposerQueryTagHole;

interface RunLatestSourceEsqlQueryArgs {
  esClient: ElasticsearchClient;
  /**
   * When provided, the query is scoped to the given space via `kibana.space_ids`.
   * When omitted, the data stream is treated as space-agnostic and no space
   * filter is applied.
   */
  space?: string;
  options: CommonSearchOptions;
  index: string;
  where?: LatestSourceWhereCondition;
  /**
   * Filter applied AFTER the latest-per-group reduction, against the surviving
   * "current state" rows. Use this to drop groups whose latest event is a
   * tombstone (e.g. `feature.deleted IS NULL OR feature.deleted == false`).
   *
   * Distinct from `where`, which runs pre-grouping and would incorrectly let
   * an older non-tombstone revision become the "latest" of its group.
   */
  postGroupingWhere?: LatestSourceWhereCondition;
  sort?: ComposerSortShorthand[];
  /**
   * Field(s) to group by for "latest revision" semantics. Pass a tuple to
   * avoid collapsing entries that share the primary key but differ on the
   * secondary field (e.g. same feature.id across different streams).
   */
  groupBy: string | [string, string];
}

export const runLatestSourceEsqlQuery = async <T>({
  esClient,
  space,
  options,
  index,
  where,
  postGroupingWhere,
  sort,
  groupBy,
}: RunLatestSourceEsqlQueryArgs): Promise<{ hits: T[] }> => {
  let query = esql.from([index], ['_id', '_source']);
  if (space !== undefined) {
    query = query.where`\`kibana.space_ids\` == ${space}`;
  }

  if (options.from !== undefined) {
    query = query.where`@timestamp >= TO_DATETIME(${esql.str(options.from)})`;
  }

  if (options.to !== undefined) {
    query = query.where`@timestamp <= TO_DATETIME(${esql.str(options.to)})`;
  }

  if (where) {
    query = query.where`${where}`;
  }

  // pick the latest events by group
  if (Array.isArray(groupBy)) {
    query = query.pipe`INLINE STATS latest_ts = MAX(@timestamp) BY ${esql.col(
      groupBy[0]
    )}, ${esql.col(groupBy[1])}`.where`@timestamp == latest_ts`;
    query = query.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY ${esql.col(groupBy[0])}, ${esql.col(
      groupBy[1]
    )}`.where`_id == tiebreaker_id`;
  } else {
    query = query.pipe`INLINE STATS latest_ts = MAX(@timestamp) BY ${esql.col(groupBy)}`
      .where`@timestamp == latest_ts`;
    query = query.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY ${esql.col(groupBy)}`
      .where`_id == tiebreaker_id`;
  }

  if (postGroupingWhere) {
    query = query.where`${postGroupingWhere}`;
  }

  if (sort?.length) {
    query = query.sort(sort[0], ...sort.slice(1));
  }

  query = query.keep('_source');

  const response = (await esClient.esql.query({
    query: query.print(),
  })) as ESQLSearchResponse;

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
