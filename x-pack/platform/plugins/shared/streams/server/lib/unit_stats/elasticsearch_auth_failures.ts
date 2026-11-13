/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import type { StreamsUnit } from '@kbn/streams-schema';
import { STATS_COLUMN } from './constants';
import { groupById, indexById, numberOrNull, type EsqlRow } from './mappers/esql_rows';
import {
  toFailureRate,
  toItemRate,
  toPercentage,
  type StatsFailureRate,
} from './mappers/stats_values';
import type { DestinationStatsQueryParams } from './query_builders/build_destination_stats_queries';
import {
  buildElasticsearchAuthFailureBreakdownQuery,
  buildElasticsearchAuthFailureRatesQuery,
} from './query_builders/build_elasticsearch_auth_failure_queries';
import type { StatsQueryBaseParams } from './query_builders/filters';
import type { DestinationQueryRef } from './query_refs';

/** The authentication and authorization failures of one destination. */
export interface AuthFailures {
  authentication: StatsFailureRate;
  authorization: StatsFailureRate;
}

const hasFailures = (row: EsqlRow): boolean =>
  (numberOrNull(row[STATS_COLUMN.authenticationRate]) ?? 0) > 0 ||
  (numberOrNull(row[STATS_COLUMN.authorizationRate]) ?? 0) > 0;

const noFailuresFound = (attempts: number | null): AuthFailures => ({
  authentication: { rate: toItemRate(0), percentage: toPercentage(0, attempts) },
  authorization: { rate: toItemRate(0), percentage: toPercentage(0, attempts) },
});

/**
 * The failures of destinations that the failed rate shows have some. It asks for the rates first,
 * and then which collections the destinations with such failures wrote to. It never throws: when a
 * query fails, `onFailure` hears about it and the result has what the other query returned. A
 * destination with no rates query result is left out. The collections are missing when their query
 * failed.
 */
const queryAuthFailures = async ({
  runQuery,
  params,
  attemptsOf,
  onFailure,
}: {
  runQuery: (query: ComposerQuery) => Promise<EsqlRow[]>;
  params: DestinationStatsQueryParams;
  attemptsOf: (id: string) => number | null;
  onFailure: (error: unknown, what: string) => void;
}): Promise<Array<[string, AuthFailures]>> => {
  let rateRows: EsqlRow[];
  try {
    rateRows = await runQuery(buildElasticsearchAuthFailureRatesQuery(params));
  } catch (error) {
    onFailure(error, 'authentication and authorization rates');
    return [];
  }

  const ratesById = indexById(rateRows, STATS_COLUMN.id);
  const failingIds = Object.entries(ratesById).flatMap(([id, row]) =>
    hasFailures(row) ? [id] : []
  );

  let breakdownById: Record<string, EsqlRow[]> = {};
  if (failingIds.length > 0) {
    try {
      const breakdownRows = await runQuery(
        buildElasticsearchAuthFailureBreakdownQuery({ ...params, ids: failingIds })
      );
      breakdownById = groupById(breakdownRows, STATS_COLUMN.id);
    } catch (error) {
      onFailure(error, 'authentication and authorization breakdown');
    }
  }

  return Object.entries(ratesById).map(([id, row]) => {
    // An id is user-defined, so `constructor` must not be read from `Object.prototype`.
    const breakdownRows = Object.hasOwn(breakdownById, id) ? breakdownById[id] : [];

    return [
      id,
      {
        authentication: toFailureRate({
          rate: numberOrNull(row[STATS_COLUMN.authenticationRate]),
          attempts: attemptsOf(id),
          breakdownRows,
          column: STATS_COLUMN.authenticationRate,
        }),
        authorization: toFailureRate({
          rate: numberOrNull(row[STATS_COLUMN.authorizationRate]),
          attempts: attemptsOf(id),
          breakdownRows,
          column: STATS_COLUMN.authorizationRate,
        }),
      },
    ];
  });
};

/**
 * The authentication and authorization failures of Elasticsearch destinations, by destination id.
 * `parentResults` are the results of the destinations so far, and the failed rate in each one
 * decides what to ask. Both kinds of failure are failed items, so a failed rate of 0 means none of either,
 * with no query. A destination with no failed rate has no data, and is left out. Only the
 * destinations that fail are asked about. A destination that is left out, or whose queries failed,
 * shows as no data.
 */
export const getElasticsearchAuthFailures = async ({
  runQuery,
  baseParams,
  destinations,
  parentResults,
  onFailure,
}: {
  runQuery: (query: ComposerQuery) => Promise<EsqlRow[]>;
  baseParams: StatsQueryBaseParams;
  destinations: DestinationQueryRef[];
  parentResults: Record<string, StreamsUnit.StatsDestinationResult>;
  onFailure: (error: unknown, what: string) => void;
}): Promise<Record<string, AuthFailures>> => {
  // An id is user-defined, so `constructor` must not be read from `Object.prototype`.
  const failedRateOf = ({ id }: DestinationQueryRef): number | null =>
    Object.hasOwn(parentResults, id) ? parentResults[id].events.failed.rate.value : null;
  // The failures are items, so what they are a share of is the incoming items.
  const incomingRateOf = (id: string): number | null =>
    Object.hasOwn(parentResults, id) ? parentResults[id].events.incoming.rate.value : null;

  const withoutFailures = destinations.flatMap(
    (destination): Array<[string, AuthFailures]> =>
      failedRateOf(destination) === 0
        ? [[destination.id, noFailuresFound(incomingRateOf(destination.id))]]
        : []
  );
  const failing = destinations.filter((destination) => (failedRateOf(destination) ?? 0) > 0);

  const withFailures =
    failing.length > 0
      ? await queryAuthFailures({
          runQuery,
          params: { ...baseParams, ids: failing.map(({ id }) => id) },
          attemptsOf: incomingRateOf,
          onFailure,
        })
      : [];

  return Object.fromEntries([...withoutFailures, ...withFailures]);
};
