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
  space: string;
  options: CommonSearchOptions;
  index: string;
  where?: LatestSourceWhereCondition;
  sort?: ComposerSortShorthand[];
  groupBy: string;
}

export const runLatestSourceEsqlQuery = async <T>({
  esClient,
  space,
  options,
  index,
  where,
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

  // pick the latest events by group
  query = query.pipe`INLINE STATS latest_ts = MAX(@timestamp) BY ${esql.col(groupBy)}`
    .where`@timestamp == latest_ts`;

  // use _id as a tiebreak in case multiple events share the same timestamp
  query = query.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY ${esql.col(groupBy)}`
    .where`_id == tiebreaker_id`;

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
