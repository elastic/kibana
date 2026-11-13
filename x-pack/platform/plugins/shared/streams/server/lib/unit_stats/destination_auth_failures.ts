/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import type { StreamsUnit } from '@kbn/streams-schema';
import { getElasticsearchAuthFailures } from './elasticsearch_auth_failures';
import type { EsqlRow } from './mappers/esql_rows';
import type { AuthFailureStats } from './mappers/map_destination_stats_result';
import type { StatsQueryBaseParams } from './query_builders/filters';
import type { DestinationQueryRef } from './query_refs';
import { getS3AuthFailures } from './s3_auth_failures';

type GetAuthFailures = (args: {
  runQuery: (query: ComposerQuery) => Promise<EsqlRow[]>;
  baseParams: StatsQueryBaseParams;
  destinations: DestinationQueryRef[];
  parentResults: Record<string, StreamsUnit.StatsDestinationResult>;
  onFailure: (error: unknown, what: string) => void;
}) => Promise<Record<string, AuthFailureStats>>;

/**
 * How each destination type reports its authentication and authorization failures. A type that
 * is not here has none to report, so its destinations get no rates. A map, because a destination
 * type comes from the unit config and must not be read from `Object.prototype`.
 */
const AUTH_FAILURES_BY_TYPE: ReadonlyMap<string, GetAuthFailures> = new Map([
  ['elasticsearch', getElasticsearchAuthFailures],
  ['remote_elasticsearch', getElasticsearchAuthFailures],
  ['s3', getS3AuthFailures],
]);

/**
 * The authentication and authorization failures of destinations, by id. The destinations are
 * grouped by how their type reports them, and each group is asked once, in parallel, with the
 * results of the destinations so far (`parentResults`), which tell it which ones to look at. A
 * destination whose type has no way to report them, or that its group left out, is not in the
 * result, and the caller shows it as no data.
 */
export const getDestinationAuthFailures = async ({
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
}): Promise<Record<string, AuthFailureStats>> => {
  const destinationsByProvider = new Map<GetAuthFailures, DestinationQueryRef[]>();
  for (const destination of destinations) {
    const provider = AUTH_FAILURES_BY_TYPE.get(destination.type);
    if (provider) {
      destinationsByProvider.set(provider, [
        ...(destinationsByProvider.get(provider) ?? []),
        destination,
      ]);
    }
  }

  const results = await Promise.all(
    [...destinationsByProvider].map(([provider, group]) =>
      provider({ runQuery, baseParams, destinations: group, parentResults, onFailure })
    )
  );

  return Object.fromEntries(results.flatMap((result) => Object.entries(result)));
};
