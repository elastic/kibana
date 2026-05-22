/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  pickLatestPerGroup,
  type LatestSourceWhereCondition,
} from '../../sig_events/latest_source_query';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from './data_stream';
import { runEsqlQuery } from '../../sig_events/run_esql_query';
export const andWhere = (
  current: LatestSourceWhereCondition | undefined,
  next: LatestSourceWhereCondition
): LatestSourceWhereCondition => {
  return current ? esql.exp`${current} AND ${next}` : next;
};

export const combineWhere = (
  ...conditions: Array<LatestSourceWhereCondition | undefined>
): LatestSourceWhereCondition | undefined => {
  return conditions.reduce<LatestSourceWhereCondition | undefined>(
    (acc, next) => (next ? (acc ? esql.exp`${acc} AND ${next}` : next) : acc),
    undefined
  );
};

/**
 * `<column> IN (...)` predicate over a list of string literals. Returns
 * undefined for an empty list so callers can opt out without a sentinel
 * and compose cleanly under `combineWhere`. A single-element list
 * renders as `IN ("x")`, which is semantically equivalent to `== "x"`.
 *
 * `T extends string` lets callers narrow the value type at the call site
 * (e.g. `inPredicate(TYPE, [KI_TYPE_FEATURE])` infers `T` as the
 * `KnowledgeIndicatorType` literal). Note: the column → value-type
 * relationship is not enforced — passing arbitrary strings to a column
 * with a constrained domain compiles. Current callers pass literal
 * constants only, so this is left as a reviewer-checked invariant
 * rather than encoded in the type system.
 */
export const inPredicate = <T extends string>(
  column: string,
  values: readonly T[]
): LatestSourceWhereCondition | undefined => {
  if (values.length === 0) return undefined;
  const literals = values.map((v) => esql.str(v));
  return esql.exp`${esql.col(column)} IN (${literals})`;
};

export const IS_NOT_DELETED: LatestSourceWhereCondition = esql.exp`${esql.col(
  'deleted'
)} IS NULL OR ${esql.col('deleted')} == false`;

export const IS_NOT_EXPIRED: LatestSourceWhereCondition = esql.exp`${esql.col(
  'excluded'
)} IS NULL OR ${esql.col('excluded')} == false`;

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
  streamNames,
  type,
  extraWhere,
  postGroupingWhere = IS_NOT_DELETED,
}: {
  esClient: ElasticsearchClient;
  streamNames: string[];
  type?: 'feature' | 'query';
  extraWhere?: LatestSourceWhereCondition;
  postGroupingWhere?: LatestSourceWhereCondition;
}): Promise<Array<{ stream_name: string; type: string; id: string }>> {
  if (streamNames.length === 0) {
    return [];
  }

  let query = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_id']);

  const streamLiterals = streamNames.map((name) => esql.str(name));
  query = query.where`${esql.col('stream.name')} IN (${streamLiterals})`;

  if (type) {
    query = query.where`${esql.col('type')} == ${esql.str(type)}`;
  }

  if (extraWhere) {
    query = query.where`${extraWhere}`;
  }

  query = pickLatestPerGroup(query, ['stream.name', 'type', 'id']);

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
