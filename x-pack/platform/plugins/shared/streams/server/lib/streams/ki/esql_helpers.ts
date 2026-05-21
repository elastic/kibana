/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { LatestSourceWhereCondition } from '../../sig_events/latest_source_query';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from './data_stream';
import { runEsqlQuery } from '../../sig_events/run_esql_query';

/**
 * Combine two ES|QL `WHERE` conditions with AND.
 */
export const andWhere = (
  current: LatestSourceWhereCondition | undefined,
  next: LatestSourceWhereCondition
): LatestSourceWhereCondition => {
  return current ? esql.exp`${current} AND ${next}` : next;
};

/**
 * Post-grouping filter that drops tombstoned (deleted) revisions. Applied
 * after the latest-per-group reduction so groups whose latest revision is
 * a tombstone disappear entirely.
 *
 * `deleted IS NULL OR deleted == false` matches both pre-deletion docs (no
 * `deleted` field) and revisions that explicitly cleared the flag.
 */
export const NOT_DELETED_POST_GROUPING_WHERE: LatestSourceWhereCondition = esql.exp`${esql.col(
  'deleted'
)} IS NULL OR ${esql.col('deleted')} == false`;

/**
 * Default read filter for feature KIs: hide both tombstones and excluded
 * revisions. `excluded` lives at the document root (mirrors `deleted`) so
 * the same shape can be applied to query KIs in the future without a
 * mapping change.
 */
export const NOT_EXCLUDED_POST_GROUPING_WHERE: LatestSourceWhereCondition = esql.exp`(${esql.col(
  'deleted'
)} IS NULL OR ${esql.col('deleted')} == false) AND (${esql.col(
  'excluded'
)} IS NULL OR ${esql.col('excluded')} == false)`;

/**
 * Read filter that returns only excluded (and not deleted) revisions.
 * Used by `getExcludedFeatures` and the keep-alive refresh path.
 */
export const EXCLUDED_ONLY_POST_GROUPING_WHERE: LatestSourceWhereCondition = esql.exp`(${esql.col(
  'deleted'
)} IS NULL OR ${esql.col('deleted')} == false) AND ${esql.col('excluded')} == true`;

/**
 * Lightweight ES|QL probe: returns the latest `(stream.name, type, id)`
 * tuples for a stream (or set of streams), filtered by an optional pre-
 * grouping `WHERE` condition.
 *
 * Used as phase 1 of two-phase reads where phase 2 ranks via a retriever
 * on the resulting id-set.
 */
export async function runLatestIdsEsqlQuery({
  esClient,
  space,
  streamNames,
  type,
  extraWhere,
  postGroupingWhere = NOT_DELETED_POST_GROUPING_WHERE,
}: {
  esClient: ElasticsearchClient;
  space: string;
  streamNames: string[];
  type?: 'feature' | 'query';
  extraWhere?: LatestSourceWhereCondition;
  postGroupingWhere?: LatestSourceWhereCondition;
}): Promise<Array<{ stream_name: string; type: string; id: string }>> {
  if (streamNames.length === 0) {
    return [];
  }

  let query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_id'])
    .where`\`kibana.space_ids\` == ${space}`;

  const streamLiterals = streamNames.map((name) => esql.str(name));
  query = query.where`${esql.col('stream.name')} IN (${streamLiterals})`;

  if (type) {
    query = query.where`${esql.col('type')} == ${esql.str(type)}`;
  }

  if (extraWhere) {
    query = query.where`${extraWhere}`;
  }

  // Latest revision per (stream.name, type, id). Two-stage reduction with
  // INLINE STATS is the same pattern used by runLatestSourceEsqlQuery.
  const groupByCols = [esql.col('stream.name'), esql.col('type'), esql.col('id')];
  query = query.pipe`INLINE STATS latest_ts = MAX(@timestamp) BY ${groupByCols}`
    .where`@timestamp == latest_ts`;
  query = query.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY ${groupByCols}`
    .where`_id == tiebreaker_id`;

  if (postGroupingWhere) {
    query = query.where`${postGroupingWhere}`;
  }

  query = query.keep('stream.name', 'type', 'id');

  const response = await runEsqlQuery(esClient, query.print());
  if (!response) {
    return [];
  }

  const streamCol = response.columns.findIndex((c) => c.name === 'stream.name');
  const typeCol = response.columns.findIndex((c) => c.name === 'type');
  const idCol = response.columns.findIndex((c) => c.name === 'id');
  if (streamCol === -1 || typeCol === -1 || idCol === -1) {
    return [];
  }

  return response.values.map((row) => ({
    stream_name: String(row[streamCol]),
    type: String(row[typeCol]),
    id: String(row[idCol]),
  }));
}
