/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { STATS_COLUMN } from '../constants';
import { indexById, numberOrNull, type EsqlRow } from './esql_rows';
import { toItemRate } from './stats_values';

export const noSourceStats = (): StreamsUnit.StatsSourceResult => ({
  events: { accepted: { rate: toItemRate(null) } },
});

/**
 * Places the rows of the source query, one per source that has items in the window, into the
 * result of each of them. A rate that ES|QL returned as null stays no data.
 */
export const mapSourceStatsRows = ({
  rows,
}: {
  rows: EsqlRow[];
}): Record<string, StreamsUnit.StatsSourceResult> =>
  Object.fromEntries(
    Object.entries(indexById(rows, STATS_COLUMN.id)).map(([id, row]) => [
      id,
      { events: { accepted: { rate: toItemRate(numberOrNull(row[STATS_COLUMN.acceptedRate])) } } },
    ])
  );
