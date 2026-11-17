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
import {
  noAuthFailures,
  noS3AuthFailures,
  type AuthFailureStats,
} from './mappers/map_destination_stats_result';
import type { StatsQueryBaseParams } from './query_builders/filters';
import type { DestinationQueryRef } from './query_refs';
import { getS3AuthFailures } from './s3_auth_failures';

type GetAuthFailures = (args: {
  runQuery: (query: ComposerQuery) => Promise<EsqlRow[]>;
  baseParams: StatsQueryBaseParams;
  destinations: DestinationQueryRef[];
  parentResults: Record<string, StreamsUnit.StatsDestinationResult>;
}) => Promise<Record<string, AuthFailureStats>>;

/** A group of destinations that share a provider, whose provider threw. */
export interface FailedAuthFailuresGroup {
  /** The distinct destination types of the group. */
  types: string[];
  ids: string[];
  error: unknown;
}

export interface DestinationAuthFailures {
  /** The failures that the providers read, by destination id. */
  failures: Record<string, AuthFailureStats>;
  failedGroups: FailedAuthFailuresGroup[];
}

/** How a destination type reports its failures, and what it shows when it could not. */
interface AuthFailuresSource {
  getFailures: GetAuthFailures;
  noData: () => AuthFailureStats;
}

const ELASTICSEARCH_SOURCE: AuthFailuresSource = {
  getFailures: getElasticsearchAuthFailures,
  noData: noAuthFailures,
};

const S3_SOURCE: AuthFailuresSource = {
  getFailures: getS3AuthFailures,
  noData: noS3AuthFailures,
};

/**
 * How each destination type reports its authentication and authorization failures. A type that
 * is not here has none to report, so its destinations get no rates. A map, because a destination
 * type comes from the unit config and must not be read from `Object.prototype`.
 */
const AUTH_FAILURES_BY_TYPE: ReadonlyMap<string, AuthFailuresSource> = new Map([
  ['elasticsearch', ELASTICSEARCH_SOURCE],
  ['remote_elasticsearch', ELASTICSEARCH_SOURCE],
  ['s3', S3_SOURCE],
]);

/**
 * The failures of a destination of this type when none could be read: its provider failed, or left
 * it out. The units are the ones its type reports in.
 */
export const getNoAuthFailures = (type: string): AuthFailureStats =>
  (AUTH_FAILURES_BY_TYPE.get(type)?.noData ?? noAuthFailures)();

/**
 * The authentication and authorization failures of destinations, by id. The destinations are
 * grouped by how their type reports them, and each group is asked once, in parallel, with the
 * results of the destinations so far (`parentResults`), which tell it which ones to look at. A
 * destination whose type has no way to report them, or that its group left out, is not in
 * `failures`, and the caller shows it as no data.
 *
 * A group whose provider throws does not stop the others. It is in `failedGroups` with its error,
 * and the caller reports it.
 */
export const getDestinationAuthFailures = async ({
  runQuery,
  baseParams,
  destinations,
  parentResults,
}: {
  runQuery: (query: ComposerQuery) => Promise<EsqlRow[]>;
  baseParams: StatsQueryBaseParams;
  destinations: DestinationQueryRef[];
  parentResults: Record<string, StreamsUnit.StatsDestinationResult>;
}): Promise<DestinationAuthFailures> => {
  const destinationsBySource = new Map<AuthFailuresSource, DestinationQueryRef[]>();
  for (const destination of destinations) {
    const source = AUTH_FAILURES_BY_TYPE.get(destination.type);
    if (source) {
      destinationsBySource.set(source, [...(destinationsBySource.get(source) ?? []), destination]);
    }
  }

  const groups = [...destinationsBySource];
  const settled = await Promise.allSettled(
    groups.map(([{ getFailures }, group]) =>
      getFailures({ runQuery, baseParams, destinations: group, parentResults })
    )
  );

  const failures: Record<string, AuthFailureStats> = {};
  const failedGroups: FailedAuthFailuresGroup[] = [];
  settled.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      Object.assign(failures, outcome.value);
      return;
    }
    const [, group] = groups[index];
    failedGroups.push({
      types: [...new Set(group.map(({ type }) => type))],
      ids: group.map(({ id }) => id),
      error: outcome.reason,
    });
  });

  return { failures, failedGroups };
};
