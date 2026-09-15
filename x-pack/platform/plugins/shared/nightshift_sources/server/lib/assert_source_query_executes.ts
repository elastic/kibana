/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isEsqlUnknownIndexError, isEsqlVerificationError, toBoom } from './es_errors';
import { getSourceCommandQuery } from './validate_source_query';

const withLimitZero = (esql: string): string => `${esql}\n| LIMIT 0`;

// ES|QL answers a wildcard that matches nothing with a single placeholder column of this name.
const ESQL_EMPTY_RELATION_COLUMN = '<no-fields>';

interface EsqlColumnsResponse {
  columns?: Array<{ name: string }>;
}

const isEmptyRelation = ({ columns = [] }: EsqlColumnsResponse): boolean =>
  columns.every((column) => column.name === ESQL_EMPTY_RELATION_COLUMN);

/**
 * True when nothing exists yet behind the query's source command. A concrete name that does not
 * exist fails with "Unknown index"; a wildcard that matches nothing succeeds with an empty
 * relation. Either way there is no schema to validate `WHERE` against, and that is not the
 * source's fault.
 */
export const hasNoIndicesBehind = async ({
  esClient,
  esql,
}: {
  esClient: ElasticsearchClient;
  esql: string;
}): Promise<boolean> => {
  try {
    const response = await esClient.esql.query({
      query: withLimitZero(getSourceCommandQuery(esql)),
      format: 'json',
    });
    return isEmptyRelation(response as EsqlColumnsResponse);
  } catch (error) {
    return isEsqlUnknownIndexError(error);
  }
};

/**
 * Runs `<esql> | LIMIT 0` as the current user. A query over indices that do not exist yet is
 * accepted, which also means field names in `WHERE` are only checked once data exists.
 */
export const assertSourceQueryExecutes = async ({
  esClient,
  esql,
}: {
  esClient: ElasticsearchClient;
  esql: string;
}): Promise<void> => {
  try {
    await esClient.esql.query({ query: withLimitZero(esql), format: 'json' });
  } catch (error) {
    if (isEsqlUnknownIndexError(error)) {
      return;
    }
    if (isEsqlVerificationError(error) && (await hasNoIndicesBehind({ esClient, esql }))) {
      return;
    }
    throw toBoom(error, 'ES|QL query cannot be executed');
  }
};
