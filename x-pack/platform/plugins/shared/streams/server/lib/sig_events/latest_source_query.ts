/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { type CommonSearchOptions } from './query_utils';

interface RunLatestSourceEsqlQueryArgs {
  esClient: ElasticsearchClient;
  space: string;
  options: CommonSearchOptions;
  index: string;
  groupBy: string;
}

export const runLatestSourceEsqlQuery = async <T>({
  esClient,
  space,
  options,
  index,
  groupBy,
}: RunLatestSourceEsqlQueryArgs): Promise<{ hits: T[] }> => {
  let query = esql.from([index], ['_id', '_source']).where`\`kibana.space_ids\` == ${space}`;

  if (options.from !== undefined) {
    const fromIso = new Date(options.from).toISOString();
    query = query.where`@timestamp >= TO_DATETIME(${fromIso})`;
  }

  if (options.to !== undefined) {
    const toIso = new Date(options.to).toISOString();
    query = query.where`@timestamp <= TO_DATETIME(${toIso})`;
  }

  // pick the latest events by group
  query = query.pipe`INLINE STATS latest_ts = MAX(@timestamp) BY ${esql.col(groupBy)}`
    .where`@timestamp == latest_ts`;

  // use _id as a tiebreak in case multiple events share the same timestamp
  query = query.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY ${esql.col(groupBy)}`
    .where`_id == tiebreaker_id`;

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
