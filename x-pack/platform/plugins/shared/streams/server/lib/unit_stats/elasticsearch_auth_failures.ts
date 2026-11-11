/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { STATS_COLUMN } from './constants';
import { groupById, indexById, numberOrNull, type EsqlRow } from './mappers/esql_rows';
import { toFailureRate, type StatsFailureRate } from './mappers/stats_values';
import type { DestinationStatsQueryParams } from './query_builders/build_destination_stats_queries';
import {
  buildElasticsearchAuthFailureCollectionsQuery,
  buildElasticsearchAuthFailureRatesQuery,
} from './query_builders/build_elasticsearch_auth_failure_queries';

/** The authentication and authorization failures of one destination. */
export interface AuthFailures {
  authentication: StatsFailureRate;
  authorization: StatsFailureRate;
}

const hasFailures = (row: EsqlRow): boolean =>
  (numberOrNull(row[STATS_COLUMN.authenticationRate]) ?? 0) > 0 ||
  (numberOrNull(row[STATS_COLUMN.authorizationRate]) ?? 0) > 0;

/**
 * The authentication and authorization failures of Elasticsearch destinations, by destination id.
 * It asks for the rates first, and only for the destinations that have failures, then asks which
 * collections they were for. It never throws: when a query fails, `onFailure` hears about it and
 * the result has what the other query returned. A destination with no rates query result is left
 * out, and the caller shows it as no data. The collections are missing when their query failed.
 */
export const getElasticsearchAuthFailures = async ({
  runQuery,
  params,
  onFailure,
}: {
  runQuery: (query: ComposerQuery) => Promise<EsqlRow[]>;
  params: DestinationStatsQueryParams;
  onFailure: (error: unknown, what: string) => void;
}): Promise<Record<string, AuthFailures>> => {
  let rateRows: EsqlRow[];
  try {
    rateRows = await runQuery(buildElasticsearchAuthFailureRatesQuery(params));
  } catch (error) {
    onFailure(error, 'authentication and authorization rates');
    return {};
  }

  const ratesById = indexById(rateRows, STATS_COLUMN.id);
  const failingIds = Object.entries(ratesById).flatMap(([id, row]) =>
    hasFailures(row) ? [id] : []
  );

  let collectionsById: Record<string, EsqlRow[]> = {};
  if (failingIds.length > 0) {
    try {
      const collectionRows = await runQuery(
        buildElasticsearchAuthFailureCollectionsQuery({ ...params, ids: failingIds })
      );
      collectionsById = groupById(collectionRows, STATS_COLUMN.id);
    } catch (error) {
      onFailure(error, 'authentication and authorization collections');
    }
  }

  return Object.fromEntries(
    Object.entries(ratesById).map(([id, row]) => {
      // An id is user-defined, so `constructor` must not be read from `Object.prototype`.
      const collectionRows = Object.hasOwn(collectionsById, id) ? collectionsById[id] : [];

      return [
        id,
        {
          authentication: toFailureRate({
            rate: numberOrNull(row[STATS_COLUMN.authenticationRate]),
            collectionRows,
            column: STATS_COLUMN.authenticationRate,
          }),
          authorization: toFailureRate({
            rate: numberOrNull(row[STATS_COLUMN.authorizationRate]),
            collectionRows,
            column: STATS_COLUMN.authorizationRate,
          }),
        },
      ];
    })
  );
};
