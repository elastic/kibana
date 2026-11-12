/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { getElasticsearchAuthFailures, type AuthFailures } from './elasticsearch_auth_failures';
import type { EsqlRow } from './mappers/esql_rows';
import type { DestinationStatsQueryParams } from './query_builders/build_destination_stats_queries';
import type { StatsQueryBaseParams } from './query_builders/filters';

type GetAuthFailures = (args: {
  runQuery: (query: ComposerQuery) => Promise<EsqlRow[]>;
  params: DestinationStatsQueryParams;
  onFailure: (error: unknown, what: string) => void;
}) => Promise<Record<string, AuthFailures>>;

/**
 * How each destination type reports its authentication and authorization failures. A type that
 * is not here has none to report, so its destinations get no rates. A map, because a destination
 * type comes from the unit config and must not be read from `Object.prototype`.
 */
const AUTH_FAILURES_BY_TYPE: ReadonlyMap<string, GetAuthFailures> = new Map([
  ['elasticsearch', getElasticsearchAuthFailures],
  ['remote_elasticsearch', getElasticsearchAuthFailures],
]);

/**
 * The authentication and authorization failures of destinations, by id. The ids are grouped by
 * how their type reports them, and each group is asked once, in parallel. A destination whose type
 * has no way to report them, or that its group left out, is not in the result, and the caller
 * shows it as no data.
 */
export const getDestinationAuthFailures = async ({
  runQuery,
  baseParams,
  destinations,
  onFailure,
}: {
  runQuery: (query: ComposerQuery) => Promise<EsqlRow[]>;
  baseParams: StatsQueryBaseParams;
  destinations: Array<{ id: string; type: string }>;
  onFailure: (error: unknown, what: string) => void;
}): Promise<Record<string, AuthFailures>> => {
  const idsByProvider = new Map<GetAuthFailures, string[]>();
  for (const { id, type } of destinations) {
    const provider = AUTH_FAILURES_BY_TYPE.get(type);
    if (provider) idsByProvider.set(provider, [...(idsByProvider.get(provider) ?? []), id]);
  }

  const results = await Promise.all(
    [...idsByProvider].map(([provider, ids]) =>
      provider({ runQuery, params: { ...baseParams, ids }, onFailure })
    )
  );

  return Object.fromEntries(results.flatMap((result) => Object.entries(result)));
};
