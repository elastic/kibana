/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import type { StreamsUnit } from '@kbn/streams-schema';
import { ITEM_UNIT } from './constants';
import type { EsqlRow } from './mappers/esql_rows';
import { mapDeliverySeries, noDeliverySeries } from './mappers/map_delivery_series';
import { buildElasticsearchDeliverySeriesQuery } from './query_builders/build_elasticsearch_delivery_series_query';
import type { StatsQueryBaseParams } from './query_builders/filters';
import type { DestinationQueryRef } from './query_refs';

/**
 * The delivery series of Elasticsearch destinations, by destination id, in items. One query for all
 * of them. A destination with no rows has a series with no points, because it was asked for and
 * nothing was found. A query that fails throws, and the caller reports it.
 */
export const getElasticsearchDeliverySeries = async ({
  runQuery,
  baseParams,
  destinations,
  bucketMs,
}: {
  runQuery: (query: ComposerQuery) => Promise<EsqlRow[]>;
  baseParams: StatsQueryBaseParams;
  destinations: DestinationQueryRef[];
  bucketMs: number;
}): Promise<Record<string, StreamsUnit.StatsDeliverySeries>> => {
  const ids = destinations.map(({ id }) => id);
  const rows = await runQuery(
    buildElasticsearchDeliverySeriesQuery({ ...baseParams, ids, bucketMs })
  );
  const mapped = mapDeliverySeries({ rows, bucketMs, unit: ITEM_UNIT });

  // An id is user-defined, so `constructor` must not be read from `Object.prototype`.
  return Object.fromEntries(
    ids.map((id) => [
      id,
      Object.hasOwn(mapped, id) ? mapped[id] : noDeliverySeries({ bucketMs, unit: ITEM_UNIT }),
    ])
  );
};
