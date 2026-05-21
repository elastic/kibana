/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQueryTagHole, type ComposerSortShorthand } from '@elastic/esql';
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

interface RunLatestSourceEsqlQueryArgs {
  esClient: ElasticsearchClient;
  space: string;
  options: CommonSearchOptions;
  index: string;
  where?: LatestSourceWhereCondition;
  postGroupingWhere?: LatestSourceWhereCondition;
  sort?: ComposerSortShorthand[];
  groupBy: LatestSourceGroupBy;
}

const buildGroupByCols = (groupBy: LatestSourceGroupBy) => {
  if (typeof groupBy === 'string') {
    return [esql.col(groupBy)];
  }
  return groupBy.map((field) => esql.col(field));
};

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
  let query = esql.from([index], ['_id', '_source']).where`\`kibana.space_ids\` == ${space}`;

  if (options.from !== undefined) {
    query = query.where`@timestamp >= TO_DATETIME(${esql.str(options.from)})`;
  }

  if (options.to !== undefined) {
    query = query.where`@timestamp <= TO_DATETIME(${esql.str(options.to)})`;
  }

  if (where) {
    query = query.where`${where}`;
  }

  const groupByCols = buildGroupByCols(groupBy);

  // pick the latest events by group
  query = query.pipe`INLINE STATS latest_ts = MAX(@timestamp) BY ${groupByCols}`
    .where`@timestamp == latest_ts`;

  // use _id as a tiebreak in case multiple events share the same timestamp
  query = query.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY ${groupByCols}`
    .where`_id == tiebreaker_id`;

  // post-grouping filter (e.g. drop tombstones) — applied after the
  // latest-per-group reduction so it operates on the latest revision only.
  if (postGroupingWhere) {
    query = query.where`${postGroupingWhere}`;
  }

  if (sort?.length) {
    query = query.sort(sort[0], ...sort.slice(1));
  }

  query = query.keep('_source');

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
