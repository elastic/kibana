/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import type { StreamsUnit } from '@kbn/streams-schema';
import { getElasticsearchDeliverySeries } from './elasticsearch_delivery_series';
import type { EsqlRow } from './mappers/esql_rows';
import type { StatsQueryBaseParams } from './query_builders/filters';
import type { DestinationQueryRef } from './query_refs';
import { getS3DeliverySeries } from './s3_delivery_series';

type GetDeliverySeries = (args: {
  runQuery: (query: ComposerQuery) => Promise<EsqlRow[]>;
  baseParams: StatsQueryBaseParams;
  destinations: DestinationQueryRef[];
  bucketMs: number;
}) => Promise<Record<string, StreamsUnit.StatsDeliverySeries>>;

/** A group of destinations that share a provider, whose provider threw. */
export interface FailedDeliverySeriesGroup {
  /** The distinct destination types of the group. */
  types: string[];
  ids: string[];
  error: unknown;
}

export interface DestinationDeliverySeries {
  /** The series that the providers read, by destination id. */
  series: Record<string, StreamsUnit.StatsDeliverySeries>;
  failedGroups: FailedDeliverySeriesGroup[];
}

/**
 * How each destination type reports its delivery series. A type that is not here has none, so its
 * destinations get no series even when they ask. A map, because a destination type comes from the
 * unit config and must not be read from `Object.prototype`.
 */
const DELIVERY_SERIES_BY_TYPE: ReadonlyMap<string, GetDeliverySeries> = new Map([
  ['elasticsearch', getElasticsearchDeliverySeries],
  ['remote_elasticsearch', getElasticsearchDeliverySeries],
  ['s3', getS3DeliverySeries],
]);

/**
 * The delivery series of the destinations that asked for one, by id. They are grouped by how their
 * type reports it, and each group is asked once, in parallel. A destination whose type has no way
 * to report one is not in `series`.
 *
 * A group whose provider throws does not stop the others. It is in `failedGroups` with its error,
 * and the caller reports it.
 */
export const getDestinationDeliverySeries = async ({
  runQuery,
  baseParams,
  destinations,
  bucketMs,
}: {
  runQuery: (query: ComposerQuery) => Promise<EsqlRow[]>;
  baseParams: StatsQueryBaseParams;
  destinations: DestinationQueryRef[];
  bucketMs: number;
}): Promise<DestinationDeliverySeries> => {
  const destinationsByProvider = new Map<GetDeliverySeries, DestinationQueryRef[]>();
  for (const destination of destinations) {
    const provider = DELIVERY_SERIES_BY_TYPE.get(destination.type);
    if (provider) {
      destinationsByProvider.set(provider, [
        ...(destinationsByProvider.get(provider) ?? []),
        destination,
      ]);
    }
  }

  const groups = [...destinationsByProvider];
  const settled = await Promise.allSettled(
    groups.map(([getSeries, group]) =>
      getSeries({ runQuery, baseParams, destinations: group, bucketMs })
    )
  );

  const series: Record<string, StreamsUnit.StatsDeliverySeries> = {};
  const failedGroups: FailedDeliverySeriesGroup[] = [];
  settled.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      Object.assign(series, outcome.value);
      return;
    }
    const [, group] = groups[index];
    failedGroups.push({
      types: [...new Set(group.map(({ type }) => type))],
      ids: group.map(({ id }) => id),
      error: outcome.reason,
    });
  });

  return { series, failedGroups };
};
