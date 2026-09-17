/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getSourceCommandQuery } from '@kbn/nightshift-shared';
import { isEsqlUnknownIndexError, isEsqlVerificationError, toBoom } from './es_errors';

// ES|QL answers a wildcard that matches nothing with a single placeholder column of this name.
const ESQL_EMPTY_RELATION_COLUMN = '<no-fields>';

/**
 * True when nothing exists yet behind the query's source command. A concrete name that does not
 * exist fails with "Unknown index"; a wildcard that matches nothing succeeds with an empty
 * relation. Either way there is no schema to validate `WHERE` against, and that is not the
 * source's fault. Other verification failures mean indices exist; anything else (403, 5xx) is
 * rethrown so callers can tell "could not look" from "looked and found nothing".
 */
export const hasNoIndicesBehind = async ({
  esClient,
  esql,
}: {
  esClient: ElasticsearchClient;
  esql: string;
}): Promise<boolean> => {
  try {
    const { columns = [] } = await esClient.esql.query({
      query: `${getSourceCommandQuery(esql)}\n| LIMIT 0`,
      format: 'json',
    });
    return columns.every((column) => column.name === ESQL_EMPTY_RELATION_COLUMN);
  } catch (error) {
    if (isEsqlVerificationError(error)) {
      return isEsqlUnknownIndexError(error);
    }
    throw error;
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
    await esClient.esql.query({ query: `${esql}\n| LIMIT 0`, format: 'json' });
  } catch (error) {
    if (isEsqlUnknownIndexError(error)) {
      return;
    }
    if (isEsqlVerificationError(error)) {
      try {
        if (await hasNoIndicesBehind({ esClient, esql })) {
          return;
        }
      } catch (probeError) {
        throw toBoom(probeError, 'ES|QL query cannot be executed');
      }
    }
    throw toBoom(error, 'ES|QL query cannot be executed');
  }
};
